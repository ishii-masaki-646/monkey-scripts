// ====== 設定 ======
const STORAGE_KEY = 'chatwork-attendance-summary:config';
const SEARCH_WORD = '勤怠';
const STANDARD_BREAK_MIN = 60; // 1h 休憩前提

// ====== 型 ======
type ScriptConfig = {
  roomId: string;
  userId: string;
};

type RawMessage = {
  timestamp: number; // unix seconds
  body: string;
};

type EventType =
  | 'start'
  | 'leave-start'
  | 'leave-end'
  | 'end'
  | 'leave-fixed' // 「私用で N 分離席」のように開始/終了で挟まないタイプ
  | 'unknown';

type ParsedEvent = {
  timestamp: number;
  type: EventType;
  raw: string;
  // leave-fixed の時のみ
  durationSec?: number;
};

type Summary = {
  workStartTs: number;
  workEndTs: number;
  endIsImplied: boolean; // 最終記録が離席で終わっていてその開始時刻を退勤扱いにした場合 true
  leaveTotalSec: number;
  workSec: number; // 実働 = (workEnd - workStart) - leaveTotal
  punchTs: number; // 打刻すべき時刻 = workEnd - (leaveTotal - 1h)
  leaveOvertimeMin: number; // > 60 の超過分（離席として表示）
  leaveShortageMin: number; // < 60 の不足分（未取得として表示）
};

// ====== Chatwork 内部 API ======
async function fetchAttendanceMessages(cfg: ScriptConfig, dateStr?: string): Promise<RawMessage[]> {
  const token = (window as unknown as { ACCESS_TOKEN?: string }).ACCESS_TOKEN;
  if (!token) throw new Error('ACCESS_TOKEN が未取得です。Chatwork のページをリロードしてください。');

  const range = getWorkdayRange(dateStr);
  const pdata = {
    room_id: parseInt(cfg.roomId, 10),
    opt: {
      q: SEARCH_WORD,
      exq: '',
      aid: [cfg.userId],
      term_from: range.from,
      term_to: range.to,
    },
    _t: token,
  };
  const params = new URLSearchParams();
  params.append('pdata', JSON.stringify(pdata));

  const res = await fetch('/gateway/search_message.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json();
  if (!data?.status?.success) throw new Error('検索 API が失敗しました');

  const msgDat = (data.result?.msg_dat ?? {}) as Record<string, { tm: number; msg: string }>;
  return Object.values(msgDat)
    .map((m) => ({ timestamp: m.tm, body: m.msg }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

// 勤務日 = 指定日 5:00 ～ 翌日 4:59:59 (dateStr 未指定かつ 0:00～4:59 に実行した場合は前日扱い)
function getWorkdayBaseDate(dateStr?: string): Date {
  if (dateStr) {
    const [y, m, d] = dateStr.split('-').map((s) => parseInt(s, 10));
    return new Date(y, m - 1, d);
  }
  const now = new Date();
  const base = new Date(now);
  if (now.getHours() < 5) base.setDate(base.getDate() - 1);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate());
}

function getWorkdayRange(dateStr?: string): { from: number; to: number } {
  const base = getWorkdayBaseDate(dateStr);
  const from = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 5, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  to.setSeconds(to.getSeconds() - 1);
  return { from: Math.floor(from.getTime() / 1000), to: Math.floor(to.getTime() / 1000) };
}

function formatDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ====== パース ======
function parseEvent(msg: RawMessage): ParsedEvent {
  const body = msg.body
    .replace(/#勤怠\s*/g, '')
    .replace(/#テレワーク\s*/g, '')
    .trim();

  // 「私用で N 分離席」/「私用で N分離席」
  const fixedMatch = body.match(/私用で\s*(\d+)\s*分\s*離席/);
  if (fixedMatch) {
    return { timestamp: msg.timestamp, type: 'leave-fixed', raw: body, durationSec: parseInt(fixedMatch[1], 10) * 60 };
  }

  // ハッシュタグの定型表記を最優先で判定
  if (body.includes('#業務開始')) return { timestamp: msg.timestamp, type: 'start', raw: body };
  if (body.includes('#業務中断')) return { timestamp: msg.timestamp, type: 'leave-start', raw: body };
  if (body.includes('#業務再開')) return { timestamp: msg.timestamp, type: 'leave-end', raw: body };
  if (body.includes('#業務終了')) return { timestamp: msg.timestamp, type: 'end', raw: body };

  // フォールバック: 自然文表記
  if (/業務再開/.test(body)) return { timestamp: msg.timestamp, type: 'leave-end', raw: body };
  if (/離席|昼休憩開始|中抜け(?:致|いた)?します/.test(body)) return { timestamp: msg.timestamp, type: 'leave-start', raw: body };
  if (/退勤|終業|お疲れ|業務を?終了|(?:これにて|お先に)失礼/.test(body)) return { timestamp: msg.timestamp, type: 'end', raw: body };
  if (/出勤|始業|おはよう|業務を?開始/.test(body)) return { timestamp: msg.timestamp, type: 'start', raw: body };
  return { timestamp: msg.timestamp, type: 'unknown', raw: body };
}

// ====== 集計 ======
function computeSummary(events: ParsedEvent[]): Summary | null {
  const known = events.filter((e) => e.type !== 'unknown');
  if (known.length === 0) return null;

  const startEv = known.find((e) => e.type === 'start');
  if (!startEv) return null;
  const workStartTs = startEv.timestamp;

  let leaveTotalSec = 0;
  let endTs: number | null = null;
  let endIsImplied = false;
  let openLeaveStart: number | null = null;

  for (const ev of known) {
    if (ev.timestamp < workStartTs) continue;
    if (ev.type === 'start') continue;

    if (ev.type === 'leave-start') {
      openLeaveStart = ev.timestamp;
    } else if (ev.type === 'leave-end') {
      if (openLeaveStart !== null) {
        leaveTotalSec += ev.timestamp - openLeaveStart;
        openLeaveStart = null;
      }
    } else if (ev.type === 'leave-fixed') {
      leaveTotalSec += ev.durationSec ?? 0;
    } else if (ev.type === 'end') {
      endTs = ev.timestamp;
    }
  }

  // 最終記録が離席で終わっている場合: その離席開始時刻を退勤とする(離席は集計に含めない)
  if (endTs === null && openLeaveStart !== null) {
    endTs = openLeaveStart;
    endIsImplied = true;
  }

  if (endTs === null) return null; // まだ勤務中など

  const workSec = endTs - workStartTs - leaveTotalSec;
  const punchTs = endTs - (leaveTotalSec - STANDARD_BREAK_MIN * 60);
  const leaveTotalMin = Math.round(leaveTotalSec / 60);
  const leaveOvertimeMin = Math.max(0, leaveTotalMin - STANDARD_BREAK_MIN);
  const leaveShortageMin = Math.max(0, STANDARD_BREAK_MIN - leaveTotalMin);

  return { workStartTs, workEndTs: endTs, endIsImplied, leaveTotalSec, workSec, punchTs, leaveOvertimeMin, leaveShortageMin };
}

// ====== フォーマット ======
function formatHourMinTight(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${String(m).padStart(2, '0')}m`;
}

function formatTimeOfDay(ts: number): string {
  const d = new Date(ts * 1000);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatSummaryLine(s: Summary): string {
  const punchStr = formatTimeOfDay(s.punchTs);
  const workStr = formatHourMinTight(Math.round(s.workSec / 60));

  if (s.leaveOvertimeMin > 0) {
    return `離席： ${formatHourMinTight(s.leaveOvertimeMin)} 　打刻： ${punchStr} 　実働： ${workStr}`;
  } else if (s.leaveShortageMin > 0) {
    return `未取得： ${formatHourMinTight(s.leaveShortageMin)} 　打刻： ${punchStr} 　実働： ${workStr}`;
  } else {
    return `打刻： ${punchStr} 　実働： ${workStr}`;
  }
}

function buildNoteText(s: Summary): string {
  if (s.leaveShortageMin > 0) return `※休憩短縮${s.leaveShortageMin}分`;
  if (s.leaveOvertimeMin > 0) return `※休憩延長${s.leaveOvertimeMin}分`;
  return '';
}

function buildJsonPayload(s: Summary): string {
  const payload = {
    punchTime: formatTimeOfDay(s.punchTs),
    workMin: Math.round(s.workSec / 60),
    leaveTotalMin: Math.round(s.leaveTotalSec / 60),
    note: buildNoteText(s),
  };
  return JSON.stringify(payload);
}

function formatRawMessages(messages: RawMessage[]): string {
  return messages
    .map((m) => {
      const d = new Date(m.timestamp * 1000);
      const date = `${d.getMonth() + 1}/${d.getDate()}`;
      const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      const body = m.body.replace(/#勤怠\s*/g, '').replace(/#テレワーク\s*/g, '').trim();
      return `${date} ${time} ${body}`;
    })
    .join('\n');
}

// ====== 設定の永続化 ======
function loadConfig(): ScriptConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (typeof obj?.roomId === 'string' && typeof obj?.userId === 'string') return obj as ScriptConfig;
    return null;
  } catch {
    return null;
  }
}

function saveConfig(cfg: ScriptConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

// ====== UI ======
const CLOCK_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
const SPINNER_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>';

const BTN_ID = 'cw-attendance-summary-btn';

// 共通: モーダル枠を生成
function buildModal(): { overlay: HTMLDivElement; box: HTMLDivElement; close: () => void } {
  document.getElementById('cw-attendance-summary-modal')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'cw-attendance-summary-modal';
  overlay.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
  const box = document.createElement('div');
  box.style.cssText =
    'background:#fff;border-radius:8px;padding:20px;max-width:680px;width:92%;max-height:80vh;display:flex;flex-direction:column;gap:12px;color:#333;';
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  return { overlay, box, close };
}

function showSettingsDialog(current: ScriptConfig | null, onSaved: (cfg: ScriptConfig) => void): void {
  const { box, close } = buildModal();

  const title = document.createElement('div');
  title.textContent = '勤怠サマリ - 設定';
  title.style.cssText = 'font-weight:bold;font-size:16px;';

  const note = document.createElement('div');
  note.style.cssText = 'font-size:12px;color:#666;line-height:1.6;';
  note.innerHTML =
    'アカウント ID: 右上の自分の名前 → 環境設定 → チャットワークについてタブ<br>ルーム ID: 勤怠を投稿しているルームの URL の <code>rid…</code> 部分';

  const userIdInput = document.createElement('input');
  userIdInput.type = 'text';
  userIdInput.placeholder = '自分のアカウント ID (例: 3247207)';
  userIdInput.value = current?.userId ?? '';
  userIdInput.style.cssText = 'padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;';

  const roomIdInput = document.createElement('input');
  roomIdInput.type = 'text';
  roomIdInput.placeholder = '勤怠ルーム ID (例: 193858216)';
  roomIdInput.value = current?.roomId ?? '';
  roomIdInput.style.cssText = 'padding:8px;border:1px solid #ccc;border-radius:4px;font-size:14px;';

  const error = document.createElement('div');
  error.style.cssText = 'color:#c33;font-size:12px;min-height:1em;';

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
  const cancelBtn = makeBtn('キャンセル', '#999', close);
  const saveBtn = makeBtn('保存', '#4caf50', () => {
    const userId = userIdInput.value.trim();
    const roomId = roomIdInput.value.trim();
    if (!/^\d+$/.test(userId) || !/^\d+$/.test(roomId)) {
      error.textContent = '数字のみで入力してください';
      return;
    }
    const cfg = { userId, roomId };
    saveConfig(cfg);
    close();
    onSaved(cfg);
  });

  btnRow.appendChild(cancelBtn);
  btnRow.appendChild(saveBtn);

  box.appendChild(title);
  box.appendChild(note);
  box.appendChild(userIdInput);
  box.appendChild(roomIdInput);
  box.appendChild(error);
  box.appendChild(btnRow);
}

function showResultDialog(summary: Summary | null, raw: RawMessage[], dateStr: string): void {
  const { box, close } = buildModal();

  const titleRow = document.createElement('div');
  titleRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;';

  const title = document.createElement('div');
  title.textContent = '勤怠サマリ';
  title.style.cssText = 'font-weight:bold;font-size:16px;';

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = dateStr;
  dateInput.style.cssText = 'padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:13px;';
  dateInput.addEventListener('change', () => {
    if (!dateInput.value) return;
    close();
    void runFlow(dateInput.value);
  });

  titleRow.appendChild(title);
  titleRow.appendChild(dateInput);

  const summaryArea = document.createElement('div');
  summaryArea.style.cssText =
    'background:#f5f7fa;border:1px solid #d8dde5;border-radius:6px;padding:14px;font-size:15px;font-family:monospace;line-height:1.6;';

  const summaryText = summary ? formatSummaryLine(summary) : '集計できる勤怠記録がありません(出勤メッセージ、または退勤メッセージが見つかりません)';
  summaryArea.textContent = summaryText;

  const supplement = document.createElement('div');
  supplement.style.cssText = 'font-size:12px;color:#666;line-height:1.5;';
  if (summary) {
    const parts = [
      `出勤: ${formatTimeOfDay(summary.workStartTs)}`,
      `退勤: ${formatTimeOfDay(summary.workEndTs)}${summary.endIsImplied ? ' (推定: 最終離席開始時刻)' : ''}`,
      `離席合計: ${formatHourMinTight(Math.round(summary.leaveTotalSec / 60))}`,
    ];
    supplement.textContent = parts.join('  /  ');
  }

  const rawArea = document.createElement('details');
  rawArea.style.cssText = 'border-top:1px solid #eee;padding-top:8px;';
  const rawSummary = document.createElement('summary');
  rawSummary.textContent = '取得した生メッセージ';
  rawSummary.style.cssText = 'cursor:pointer;font-size:13px;color:#666;';
  const rawPre = document.createElement('pre');
  rawPre.textContent = formatRawMessages(raw) || '(なし)';
  rawPre.style.cssText =
    'background:#fafafa;padding:10px;border-radius:4px;overflow:auto;max-height:240px;white-space:pre-wrap;font-size:12px;margin:8px 0 0 0;';
  rawArea.appendChild(rawSummary);
  rawArea.appendChild(rawPre);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
  const closeBtn = makeBtn('閉じる', '#999', close);
  const settingsBtn = makeBtn('設定', '#607d8b', () => {
    close();
    showSettingsDialog(loadConfig(), () => {/* 再実行は手動で */});
  });
  const copyJsonBtn = makeBtn('JSON でコピー', '#8e44ad', () => {
    if (!summary) return;
    navigator.clipboard.writeText(buildJsonPayload(summary)).then(() => {
      copyJsonBtn.textContent = 'コピーしました';
      setTimeout(() => (copyJsonBtn.textContent = 'JSON でコピー'), 1500);
    });
  });
  const copyBtn = makeBtn('サマリをコピー', '#4caf50', () => {
    if (!summary) return;
    navigator.clipboard.writeText(formatSummaryLine(summary)).then(() => {
      copyBtn.textContent = 'コピーしました';
      setTimeout(() => (copyBtn.textContent = 'サマリをコピー'), 1500);
    });
  });
  if (!summary) {
    (copyBtn as HTMLButtonElement).disabled = true;
    (copyJsonBtn as HTMLButtonElement).disabled = true;
  }

  btnRow.appendChild(settingsBtn);
  btnRow.appendChild(closeBtn);
  btnRow.appendChild(copyJsonBtn);
  btnRow.appendChild(copyBtn);

  box.appendChild(titleRow);
  box.appendChild(summaryArea);
  if (summary) box.appendChild(supplement);
  box.appendChild(rawArea);
  box.appendChild(btnRow);
}

function makeBtn(label: string, bg: string, onclick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = label;
  b.style.cssText = `padding:8px 16px;background:${bg};color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px;`;
  b.addEventListener('click', onclick);
  return b;
}

// ====== ヘッダー ボタン ======
async function runFlow(dateStr?: string): Promise<void> {
  const cfg = loadConfig();
  if (!cfg) {
    showSettingsDialog(null, () => runFlow(dateStr));
    return;
  }
  const effectiveDate = formatDateInputValue(getWorkdayBaseDate(dateStr));
  const btn = document.getElementById(BTN_ID);
  if (btn) btn.innerHTML = SPINNER_SVG;
  try {
    const messages = await fetchAttendanceMessages(cfg, effectiveDate);
    const events = messages.map(parseEvent);
    const summary = computeSummary(events);
    showResultDialog(summary, messages, effectiveDate);
  } catch (e) {
    alert((e as Error).message);
  } finally {
    if (btn) btn.innerHTML = CLOCK_SVG;
  }
}

function placeButton(): void {
  if (document.getElementById(BTN_ID)) return;
  const hintBtn = document.querySelector('[data-testid="global-header_help-center_button"]');
  if (!hintBtn?.parentNode) return;

  const btn = document.createElement('button');
  btn.id = BTN_ID;
  btn.setAttribute('aria-label', '勤怠サマリ');
  btn.setAttribute('data-tooltip', '勤怠サマリ');
  btn.className = '_showDescription';
  btn.style.cssText =
    'background:none;border:none;cursor:pointer;padding:4px 12px;margin-right:8px;color:rgb(202,218,247);fill:rgb(202,218,247);display:flex;align-items:center;justify-content:center;';
  btn.innerHTML = CLOCK_SVG;
  btn.addEventListener('mouseenter', () => {
    btn.style.color = '#fff';
    btn.style.fill = '#fff';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.color = 'rgb(202,218,247)';
    btn.style.fill = 'rgb(202,218,247)';
  });
  btn.addEventListener('click', () => void runFlow());

  hintBtn.parentNode.insertBefore(btn, hintBtn);
}

(function () {
  'use strict';
  const observer = new MutationObserver(() => placeButton());
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(placeButton, 1500);
})();

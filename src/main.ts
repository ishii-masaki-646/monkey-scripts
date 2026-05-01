// ====== 設定 ======
// 1日の所定労働時間（時間単位、小数OK：例 7.5 = 7時間30分）
const STANDARD_HOURS_PER_DAY = 8;

const ITEM_CLASS = 'vmonkey-progress-item';

(function () {
  'use strict';

  const STANDARD_MIN = Math.round(STANDARD_HOURS_PER_DAY * 60);

  // 勤怠編集画面 (#work_records/...) のときだけ計算/表示する。
  // freee 全体に @match を当てているので、それ以外のページでは何もしない。
  const isTarget = () => location.hash.startsWith('#work_records');

  let lastKey = '';

  function render() {
    if (!isTarget()) return;

    const itemsContainer = document.querySelector<HTMLElement>('.items.main-items');
    if (!itemsContainer) return;

    // freee 側のテスト用属性 [data-test] で要素取得（UI 文言変更に強い）
    const daysEl = itemsContainer.querySelector<HTMLElement>('[data-test="労働日数"]');
    const totalEl = itemsContainer.querySelector<HTMLElement>('[data-test="総勤務時間"]');
    const shortageItem = itemsContainer
      .querySelector<HTMLElement>('[data-test="不足時間"]')
      ?.closest<HTMLElement>('.item');
    if (!daysEl || !totalEl || !shortageItem) return;

    const days = parseFloat((daysEl.textContent ?? '').trim());
    const totalMin = parseHourMin(totalEl);
    if (!Number.isFinite(days) || totalMin == null) return;

    const expectedMin = Math.round(days * STANDARD_MIN);
    const diffMin = totalMin - expectedMin;

    // 入力が変わらず、かつ自身の item が DOM に残っていれば何もしない（無限ループ回避）
    const key = `${days}|${totalMin}|${STANDARD_HOURS_PER_DAY}`;
    const existing = itemsContainer.querySelector<HTMLElement>(`.${ITEM_CLASS}`);
    if (key === lastKey && existing) return;
    lastKey = key;

    let myItem = existing;
    if (!myItem) {
      myItem = document.createElement('div');
      myItem.className = `item ${ITEM_CLASS}`;
      const lbl = document.createElement('div');
      lbl.className = 'label';
      lbl.textContent = `日次過不足(${formatStandard(STANDARD_HOURS_PER_DAY)})`;
      const body = document.createElement('div');
      body.className = 'body';
      myItem.appendChild(lbl);
      myItem.appendChild(body);
    }
    shortageItem.insertAdjacentElement('afterend', myItem);

    const body = myItem.querySelector<HTMLElement>('.body')!;
    fillHourMinBody(body, diffMin);
  }

  // freee の hour-min DOM 構造から「H時間M分」を分数値に変換。
  // "173時間32分" のテキスト正規表現パースより正確で速い。
  function parseHourMin(el: HTMLElement | null): number | null {
    if (!el) return null;
    const h = el.querySelector<HTMLElement>('.hour-min__hour .hour-min__value');
    const m = el.querySelector<HTMLElement>('.hour-min__min .hour-min__value');
    if (!h && !m) return null;
    const hv = h ? Number(h.textContent ?? '0') : 0;
    const mv = m ? Number(m.textContent ?? '0') : 0;
    if (!Number.isFinite(hv) || !Number.isFinite(mv)) return null;
    return hv * 60 + mv;
  }

  function fillHourMinBody(body: HTMLElement, diffMin: number) {
    body.textContent = '';
    const sign = diffMin > 0 ? '+' : diffMin < 0 ? '-' : '';
    // + (進捗超過) はオレンジ、- (進捗不足) は赤、0 はグレー
    body.style.color = diffMin > 0 ? '#d97706' : diffMin < 0 ? '#c33' : '#666';
    const abs = Math.abs(diffMin);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    const wrap = document.createElement('span');
    wrap.className = 'hour-min';
    wrap.appendChild(buildSegment('hour', `${sign}${h}`, '時間'));
    wrap.appendChild(buildSegment('min', `${m}`, '分'));
    body.appendChild(wrap);
  }

  function buildSegment(kind: 'hour' | 'min', value: string, unit: string): HTMLSpanElement {
    const seg = document.createElement('span');
    seg.className = `hour-min__${kind}`;
    const val = document.createElement('span');
    val.className = 'hour-min__value';
    val.textContent = value;
    const u = document.createElement('span');
    u.className = 'hour-min__unit';
    u.textContent = unit;
    seg.appendChild(val);
    seg.appendChild(u);
    return seg;
  }

  function formatStandard(hours: number): string {
    // 8 → "8h"、7.5 → "7h30m"
    if (Number.isInteger(hours)) return `${hours}h`;
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m === 0 ? `${h}h` : `${h}h${m}m`;
  }

  // SPA の DOM 変化と、ハッシュベースの月切替・社員切替の双方に追従する
  const observer = new MutationObserver(() => render());
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', render);
  render();
})();

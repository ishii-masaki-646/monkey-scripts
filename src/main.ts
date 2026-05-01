// ====== 設定 ======
// 1日の所定労働時間（時間単位、小数OK：例 7.5 = 7時間30分）
const STANDARD_HOURS_PER_DAY = 8;

const ITEM_CLASS = 'vmonkey-progress-item';

(function () {
	'use strict';

	// freee 勤怠は SPA。月切替やハッシュ遷移で DOM が動的に変わるので、
	// MutationObserver で再描画ごとにこちらの計算 / 表示を更新する。
	const observer = new MutationObserver(() => render());
	observer.observe(document.body, { childList: true, subtree: true });
	render();

	let lastKey = '';

	function render() {
		const itemsContainer = document.querySelector<HTMLElement>('.items.main-items');
		if (!itemsContainer) return;

		const totalLabel = findLabel(itemsContainer, '総勤務時間');
		if (!totalLabel) return;
		const totalItem = totalLabel.parentElement!;
		const totalBody = totalItem.querySelector<HTMLElement>('.body');
		const totalText = (totalBody?.textContent ?? '').trim();
		if (!totalText) return;

		// 挿入位置の基準: 「不足時間」の直後 = 末尾。無ければ「総勤務時間」の直後。
		const fusokuLabel = findLabel(itemsContainer, '不足時間');
		const insertAfter = fusokuLabel?.parentElement ?? totalItem;

		const totalMinutes = parseHourMinute(totalText);
		const businessDays = countWorkRecordedBusinessDays();
		const expectedMinutes = Math.round(businessDays * STANDARD_HOURS_PER_DAY * 60);
		const diffMinutes = totalMinutes - expectedMinutes;

		// 入力が変わらず、かつ自身の item が DOM に残っていれば何もしない（無限ループ回避）
		const key = `${totalText}|${businessDays}|${STANDARD_HOURS_PER_DAY}`;
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
		// 末尾（「不足時間」item の直後）へ移動 / 挿入
		insertAfter.parentNode!.insertBefore(myItem, insertAfter.nextSibling);

		const body = myItem.querySelector<HTMLElement>('.body')!;
		fillHourMinBody(body, diffMinutes);
	}

	function findLabel(container: HTMLElement, text: string): HTMLElement | undefined {
		return Array.from(container.querySelectorAll<HTMLElement>('.label')).find(
			(e) => (e.textContent ?? '').trim() === text,
		);
	}

	function parseHourMinute(text: string): number {
		// "173時間32分" / "168時間" の両方に対応
		const m = text.match(/(\d+)\s*時間(?:\s*(\d+)\s*分)?/);
		if (!m) return 0;
		return parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0);
	}

	function fillHourMinBody(body: HTMLElement, diffMin: number) {
		body.textContent = '';
		const wrap = document.createElement('span');
		wrap.className = 'hour-min';
		const sign = diffMin > 0 ? '+' : diffMin < 0 ? '-' : '';
		const abs = Math.abs(diffMin);
		const h = Math.floor(abs / 60);
		const m = abs % 60;
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

	// カレンダー上で「勤怠が入力済みの営業日」をカウントする。
	// 平日（土日祝・所定休日でない日）のうち、出勤レコード（work）または
	// 有給休暇（paid-holiday）が入力されている日。
	// 有給休暇日は「総勤務時間」側にも所定労働時間分（既定 8h）が即座に加算されるため、
	// 分母にも 1 日として加算しないと過不足が崩れる（その日の +8h が丸ごと残ってしまう）。
	// 未入力の平日（未来日や入力忘れ）は分母にも分子にも入らないので、
	// 「途中まで」でも純粋な進捗を測れる。
	function countWorkRecordedBusinessDays(): number {
		const tbl = document.querySelector<HTMLTableElement>('table.employee-work-record-calendar');
		if (!tbl) return 0;
		let count = 0;
		tbl.querySelectorAll<HTMLTableCellElement>('td.day').forEach((td) => {
			const cls = td.classList;
			if (cls.contains('out-of-range')) return; // 月外
			if (cls.contains('prescribed-holiday')) return; // 所定休日（休日出勤は対象外）
			if (cls.contains('legal-holiday')) return; // 法定休日（休日出勤は対象外）
			// 出勤レコードあり、もしくは有給休暇日のみカウント
			if (cls.contains('work') || cls.contains('paid-holiday')) count++;
		});
		return count;
	}
})();

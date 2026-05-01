// ====== 設定 ======
// 1日の所定労働時間（時間単位、小数OK：例 7.5 = 7時間30分）
const STANDARD_HOURS_PER_DAY = 8;

const ITEM_CLASS = 'vmonkey-progress-item';

(function () {
	'use strict';

	// freee 勤怠は SPA。月切替やハッシュ遷移で DOM が動的に変わるので、
	// MutationObserver で再描画ごとにこちらの計算 / 表示を更新する。
	const observer = new MutationObserver(() => {
		render();
	});
	observer.observe(document.body, { childList: true, subtree: true });
	render();

	let lastKey = '';

	function render() {
		const itemsContainer = document.querySelector<HTMLElement>('.items.main-items');
		if (!itemsContainer) return;

		const totalLabel = Array.from(itemsContainer.querySelectorAll<HTMLElement>('.label')).find(
			(e) => (e.textContent ?? '').trim() === '総勤務時間',
		);
		if (!totalLabel) return;
		const totalItem = totalLabel.parentElement;
		const totalBody = totalItem?.querySelector<HTMLElement>('.body');
		const totalText = (totalBody?.textContent ?? '').trim();
		if (!totalText) return;

		const totalMinutes = parseHourMinute(totalText);
		const businessDays = countBusinessDaysBeforeToday();
		const expectedMinutes = Math.round(businessDays * STANDARD_HOURS_PER_DAY * 60);
		const diffMinutes = totalMinutes - expectedMinutes;

		// 入力が変わったときだけ描画（再帰トリガー回避）
		const key = `${totalText}|${businessDays}|${STANDARD_HOURS_PER_DAY}`;
		if (key === lastKey) return;
		lastKey = key;

		let myItem = itemsContainer.querySelector<HTMLElement>(`.${ITEM_CLASS}`);
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
			totalItem!.parentNode!.insertBefore(myItem, totalItem!.nextSibling);
		}
		const body = myItem.querySelector<HTMLElement>('.body')!;
		body.textContent = formatDiff(diffMinutes);
	}

	function parseHourMinute(text: string): number {
		// "173時間32分" → 173*60+32
		const m = text.match(/(\d+)\s*時間\s*(\d+)\s*分/);
		if (!m) return 0;
		return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
	}

	function formatDiff(min: number): string {
		const sign = min >= 0 ? '+' : '-';
		const abs = Math.abs(min);
		const h = Math.floor(abs / 60);
		const m = abs % 60;
		return `${sign}${h}時間${m}分`;
	}

	function formatStandard(hours: number): string {
		// 8 → "8h"、7.5 → "7h30m"
		if (Number.isInteger(hours)) return `${hours}h`;
		const h = Math.floor(hours);
		const m = Math.round((hours - h) * 60);
		return m === 0 ? `${h}h` : `${h}h${m}m`;
	}

	function countBusinessDaysBeforeToday(): number {
		const tbl = document.querySelector<HTMLTableElement>('table.employee-work-record-calendar');
		if (!tbl) return 0;
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		let count = 0;
		tbl.querySelectorAll<HTMLTableCellElement>('td.day').forEach((td) => {
			const cls = td.classList;
			if (cls.contains('out-of-range')) return; // 月外
			if (cls.contains('prescribed-holiday')) return; // 所定休日
			if (cls.contains('legal-holiday')) return; // 法定休日
			const dateStr = td.dataset.date;
			if (!dateStr) return;
			const d = new Date(dateStr + 'T00:00:00');
			if (Number.isNaN(d.getTime())) return;
			if (d >= today) return; // 当日以降は対象外（前日まで）
			count++;
		});
		return count;
	}
})();

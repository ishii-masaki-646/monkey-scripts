// ====== 設定 ======
// 1日の所定労働時間（時間単位、小数OK：例 7.5 = 7時間30分）
const STANDARD_HOURS_PER_DAY = 8;

(function () {
	'use strict';
	console.log(
		'[freee-attendance-progress] loaded. STANDARD_HOURS_PER_DAY =',
		STANDARD_HOURS_PER_DAY,
	);
	// TODO: ヘッダー DOM の取得 → 月初〜前日までの実労働時間集計 → 営業日数 × STANDARD_HOURS_PER_DAY との差分計算 → 「日次過不足(8h)」ラベルと値を挿入
})();

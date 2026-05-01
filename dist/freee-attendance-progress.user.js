// ==UserScript==
// @name         freee 勤怠 - 日次過不足(8h)表示
// @namespace    https://github.com/ishii-masaki-646/monkey-scripts
// @version      0.1.0
// @author       ishii-masaki-646
// @description  前日までの実労働時間に対する過不足（営業日数 × 所定労働時間との差）をヘッダーに表示する
// @downloadURL  https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/freee-attendance-progress.user.js
// @updateURL    https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/freee-attendance-progress.user.js
// @match        https://p.secure.freee.co.jp/*
// ==/UserScript==

(function () {
  'use strict';

  const STANDARD_HOURS_PER_DAY = 8;
  (function() {
    console.log(
      "[freee-attendance-progress] loaded. STANDARD_HOURS_PER_DAY =",
      STANDARD_HOURS_PER_DAY
    );
  })();

})();
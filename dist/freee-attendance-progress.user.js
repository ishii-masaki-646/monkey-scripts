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
  const ITEM_CLASS = "vmonkey-progress-item";
  (function() {
    const observer = new MutationObserver(() => {
      render();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    render();
    let lastKey = "";
    function render() {
      const itemsContainer = document.querySelector(".items.main-items");
      if (!itemsContainer) return;
      const totalLabel = Array.from(itemsContainer.querySelectorAll(".label")).find(
        (e) => (e.textContent ?? "").trim() === "総勤務時間"
      );
      if (!totalLabel) return;
      const totalItem = totalLabel.parentElement;
      const totalBody = totalItem == null ? void 0 : totalItem.querySelector(".body");
      const totalText = ((totalBody == null ? void 0 : totalBody.textContent) ?? "").trim();
      if (!totalText) return;
      const totalMinutes = parseHourMinute(totalText);
      const businessDays = countBusinessDaysBeforeToday();
      const expectedMinutes = Math.round(businessDays * STANDARD_HOURS_PER_DAY * 60);
      const diffMinutes = totalMinutes - expectedMinutes;
      const key = `${totalText}|${businessDays}|${STANDARD_HOURS_PER_DAY}`;
      if (key === lastKey) return;
      lastKey = key;
      let myItem = itemsContainer.querySelector(`.${ITEM_CLASS}`);
      if (!myItem) {
        myItem = document.createElement("div");
        myItem.className = `item ${ITEM_CLASS}`;
        const lbl = document.createElement("div");
        lbl.className = "label";
        lbl.textContent = `日次過不足(${formatStandard(STANDARD_HOURS_PER_DAY)})`;
        const body2 = document.createElement("div");
        body2.className = "body";
        myItem.appendChild(lbl);
        myItem.appendChild(body2);
        totalItem.parentNode.insertBefore(myItem, totalItem.nextSibling);
      }
      const body = myItem.querySelector(".body");
      body.textContent = formatDiff(diffMinutes);
    }
    function parseHourMinute(text) {
      const m = text.match(/(\d+)\s*時間\s*(\d+)\s*分/);
      if (!m) return 0;
      return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    }
    function formatDiff(min) {
      const sign = min >= 0 ? "+" : "-";
      const abs = Math.abs(min);
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      return `${sign}${h}時間${m}分`;
    }
    function formatStandard(hours) {
      if (Number.isInteger(hours)) return `${hours}h`;
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return m === 0 ? `${h}h` : `${h}h${m}m`;
    }
    function countBusinessDaysBeforeToday() {
      const tbl = document.querySelector("table.employee-work-record-calendar");
      if (!tbl) return 0;
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      let count = 0;
      tbl.querySelectorAll("td.day").forEach((td) => {
        const cls = td.classList;
        if (cls.contains("out-of-range")) return;
        if (cls.contains("prescribed-holiday")) return;
        if (cls.contains("legal-holiday")) return;
        const dateStr = td.dataset.date;
        if (!dateStr) return;
        const d = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
        if (Number.isNaN(d.getTime())) return;
        if (d >= today) return;
        count++;
      });
      return count;
    }
  })();

})();
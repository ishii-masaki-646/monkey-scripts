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
    const observer = new MutationObserver(() => render());
    observer.observe(document.body, { childList: true, subtree: true });
    render();
    let lastKey = "";
    function render() {
      const itemsContainer = document.querySelector(".items.main-items");
      if (!itemsContainer) return;
      const totalLabel = findLabel(itemsContainer, "総勤務時間");
      if (!totalLabel) return;
      const totalItem = totalLabel.parentElement;
      const totalBody = totalItem.querySelector(".body");
      const totalText = ((totalBody == null ? void 0 : totalBody.textContent) ?? "").trim();
      if (!totalText) return;
      const fusokuLabel = findLabel(itemsContainer, "不足時間");
      const insertAfter = (fusokuLabel == null ? void 0 : fusokuLabel.parentElement) ?? totalItem;
      const totalMinutes = parseHourMinute(totalText);
      const businessDays = countBusinessDaysBeforeToday();
      const expectedMinutes = Math.round(businessDays * STANDARD_HOURS_PER_DAY * 60);
      const diffMinutes = totalMinutes - expectedMinutes;
      const key = `${totalText}|${businessDays}|${STANDARD_HOURS_PER_DAY}`;
      const existing = itemsContainer.querySelector(`.${ITEM_CLASS}`);
      if (key === lastKey && existing) return;
      lastKey = key;
      let myItem = existing;
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
      }
      insertAfter.parentNode.insertBefore(myItem, insertAfter.nextSibling);
      const body = myItem.querySelector(".body");
      fillHourMinBody(body, diffMinutes);
    }
    function findLabel(container, text) {
      return Array.from(container.querySelectorAll(".label")).find(
        (e) => (e.textContent ?? "").trim() === text
      );
    }
    function parseHourMinute(text) {
      const m = text.match(/(\d+)\s*時間(?:\s*(\d+)\s*分)?/);
      if (!m) return 0;
      return parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0);
    }
    function fillHourMinBody(body, diffMin) {
      body.textContent = "";
      const wrap = document.createElement("span");
      wrap.className = "hour-min";
      const sign = diffMin > 0 ? "+" : diffMin < 0 ? "-" : "";
      const abs = Math.abs(diffMin);
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      wrap.appendChild(buildSegment("hour", `${sign}${h}`, "時間"));
      wrap.appendChild(buildSegment("min", `${m}`, "分"));
      body.appendChild(wrap);
    }
    function buildSegment(kind, value, unit) {
      const seg = document.createElement("span");
      seg.className = `hour-min__${kind}`;
      const val = document.createElement("span");
      val.className = "hour-min__value";
      val.textContent = value;
      const u = document.createElement("span");
      u.className = "hour-min__unit";
      u.textContent = unit;
      seg.appendChild(val);
      seg.appendChild(u);
      return seg;
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
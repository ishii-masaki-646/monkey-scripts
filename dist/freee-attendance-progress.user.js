// ==UserScript==
// @name         freee 勤怠 - 日次過不足(8h)表示
// @namespace    https://github.com/ishii-masaki-646/monkey-scripts
// @version      0.1.1
// @author       ishii-masaki-646
// @description  勤怠入力済みの営業日数 × 所定労働時間 と総勤務時間の差をヘッダーに表示する
// @downloadURL  https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/freee-attendance-progress.user.js
// @updateURL    https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/freee-attendance-progress.user.js
// @match        https://p.secure.freee.co.jp/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const STANDARD_HOURS_PER_DAY = 8;
  const ITEM_CLASS = "vmonkey-progress-item";
  (function() {
    const STANDARD_MIN = Math.round(STANDARD_HOURS_PER_DAY * 60);
    const isTarget = () => location.hash.startsWith("#/work_records");
    let lastKey = "";
    function render() {
      var _a;
      if (!isTarget()) return;
      const itemsContainer = document.querySelector(".items.main-items");
      if (!itemsContainer) return;
      const daysEl = itemsContainer.querySelector('[data-test="労働日数"]');
      const totalEl = itemsContainer.querySelector('[data-test="総勤務時間"]');
      const shortageItem = (_a = itemsContainer.querySelector('[data-test="不足時間"]')) == null ? void 0 : _a.closest(".item");
      if (!daysEl || !totalEl || !shortageItem) return;
      const days = parseFloat((daysEl.textContent ?? "").trim());
      const totalMin = parseHourMin(totalEl);
      if (!Number.isFinite(days) || totalMin == null) return;
      const expectedMin = Math.round(days * STANDARD_MIN);
      const diffMin = totalMin - expectedMin;
      const key = `${days}|${totalMin}|${STANDARD_HOURS_PER_DAY}`;
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
      shortageItem.insertAdjacentElement("afterend", myItem);
      const body = myItem.querySelector(".body");
      fillHourMinBody(body, diffMin);
    }
    function parseHourMin(el) {
      if (!el) return null;
      const h = el.querySelector(".hour-min__hour .hour-min__value");
      const m = el.querySelector(".hour-min__min .hour-min__value");
      if (!h && !m) return null;
      const hv = h ? Number(h.textContent ?? "0") : 0;
      const mv = m ? Number(m.textContent ?? "0") : 0;
      if (!Number.isFinite(hv) || !Number.isFinite(mv)) return null;
      return hv * 60 + mv;
    }
    function fillHourMinBody(body, diffMin) {
      body.textContent = "";
      const sign = diffMin > 0 ? "+" : diffMin < 0 ? "-" : "";
      body.style.color = diffMin > 0 ? "#d97706" : diffMin < 0 ? "#c33" : "#666";
      const abs = Math.abs(diffMin);
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      const wrap = document.createElement("span");
      wrap.className = "hour-min";
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
    const observer = new MutationObserver(() => render());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("hashchange", render);
    render();
  })();

})();
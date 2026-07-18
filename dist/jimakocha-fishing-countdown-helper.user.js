// ==UserScript==
// @name         jimakocha-fishing-countdown-helper
// @namespace    https://github.com/ishii-masaki-646/monkey-scripts
// @version      0.1.0
// @author       ishii-masaki-646
// @description  setTimeout をフックして当たり判定までの待機時間を検出し、画面右上にカウントダウン表示する練習用スクリプト(ランキング登録には使わないこと)
// @downloadURL  https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/jimakocha-fishing-countdown-helper.user.js
// @updateURL    https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/jimakocha-fishing-countdown-helper.user.js
// @match        https://jimakocha-festival-fishing.merorinoyumenao.workers.dev/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const MIN_DELAY = 1400;
  const MAX_DELAY = 4600;
  (function() {
    const box = document.createElement("div");
    box.style.cssText = [
      "position:fixed",
      "top:12px",
      "right:12px",
      "z-index:999999",
      "background:rgba(0,0,0,0.75)",
      "color:#0f0",
      "font:bold 20px monospace",
      "padding:8px 14px",
      "border-radius:8px",
      "pointer-events:none"
    ].join(";");
    box.textContent = "(waiting for timer...)";
    const attach = () => document.body && document.body.appendChild(box);
    attach();
    document.addEventListener("DOMContentLoaded", attach);
    let rafId = null;
    function startCountdown(delayMs) {
      if (rafId) cancelAnimationFrame(rafId);
      const start = performance.now();
      const end = start + delayMs;
      const tick = () => {
        const remaining = end - performance.now();
        if (remaining <= 0) {
          box.textContent = "NOW";
          box.style.color = "#f00";
          return;
        }
        box.style.color = "#0f0";
        box.textContent = `bite in ${remaining.toFixed(0)}ms`;
        rafId = requestAnimationFrame(tick);
      };
      tick();
    }
    const origSetTimeout = window.setTimeout;
    window.setTimeout = function(fn, delay, ...args) {
      if (typeof delay === "number" && delay >= MIN_DELAY && delay <= MAX_DELAY) {
        startCountdown(delay);
      }
      return origSetTimeout.call(window, fn, delay, ...args);
    };
    console.log(
      "[fishing-countdown-helper] installed. watching setTimeout delays in",
      MIN_DELAY,
      "-",
      MAX_DELAY,
      "ms. do not register fake scores to the live leaderboard."
    );
  })();

})();
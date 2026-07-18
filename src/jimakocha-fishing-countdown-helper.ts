// 「じまこちゃ夏祭り」屋台釣りエリア (jimakocha-festival-fishing) 用の観察スクリプト。
// setTimeout をフックして、当たり判定までの待機時間 (実測 1.5〜4.5 秒) を検出し、
// 画面右上にカウントダウンを表示するだけ。個人の練習/好奇心用。
//
// 注意: 結果ポップアップの「ランキングに登録する」は絶対に押さないこと。
// このサイトの /api/rankings は認証も検証も無いクライアント信頼型の共有 DB で、
// 実際の参加者・実際の賞典が紐づいたイベントの本番ランキングになっている。

const MIN_DELAY = 1400;
const MAX_DELAY = 4600;

(function () {
  const box = document.createElement('div');
  box.style.cssText = [
    'position:fixed',
    'top:12px',
    'right:12px',
    'z-index:999999',
    'background:rgba(0,0,0,0.75)',
    'color:#0f0',
    'font:bold 20px monospace',
    'padding:8px 14px',
    'border-radius:8px',
    'pointer-events:none',
  ].join(';');
  box.textContent = '(waiting for timer...)';
  const attach = () => document.body && document.body.appendChild(box);
  attach();
  document.addEventListener('DOMContentLoaded', attach);

  let rafId: number | null = null;
  function startCountdown(delayMs: number) {
    if (rafId) cancelAnimationFrame(rafId);
    const start = performance.now();
    const end = start + delayMs;
    const tick = () => {
      const remaining = end - performance.now();
      if (remaining <= 0) {
        box.textContent = 'NOW';
        box.style.color = '#f00';
        return;
      }
      box.style.color = '#0f0';
      box.textContent = `bite in ${remaining.toFixed(0)}ms`;
      rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  const origSetTimeout = window.setTimeout;
  window.setTimeout = function (fn: TimerHandler, delay?: number, ...args: unknown[]) {
    if (typeof delay === 'number' && delay >= MIN_DELAY && delay <= MAX_DELAY) {
      startCountdown(delay);
    }
    return origSetTimeout.call(window, fn, delay, ...args);
  } as typeof window.setTimeout;

  console.log(
    '[fishing-countdown-helper] installed. watching setTimeout delays in',
    MIN_DELAY,
    '-',
    MAX_DELAY,
    'ms. do not register fake scores to the live leaderboard.',
  );
})();

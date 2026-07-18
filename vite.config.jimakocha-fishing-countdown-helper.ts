import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/jimakocha-fishing-countdown-helper.ts',
      userscript: {
        name: 'jimakocha-fishing-countdown-helper',
        namespace: 'https://github.com/ishii-masaki-646/monkey-scripts',
        match: ['https://jimakocha-festival-fishing.merorinoyumenao.workers.dev/*'],
        version: '0.1.0',
        description: 'setTimeout をフックして当たり判定までの待機時間を検出し、画面右上にカウントダウン表示する練習用スクリプト(ランキング登録には使わないこと)',
        author: 'ishii-masaki-646',
        'run-at': 'document-start',
        grant: 'none',
        downloadURL: 'https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/jimakocha-fishing-countdown-helper.user.js',
        updateURL: 'https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/jimakocha-fishing-countdown-helper.user.js',
      },
      build: {
        fileName: 'jimakocha-fishing-countdown-helper.user.js',
      },
    }),
  ],
  build: {
    // build を直列実行する関係上、後発のビルドは dist を空にしないこと
    emptyOutDir: false,
  },
});

import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/chatwork-attendance-summary.ts',
      userscript: {
        name: 'Chatwork 勤怠サマリ',
        namespace: 'https://github.com/ishii-masaki-646/monkey-scripts',
        match: ['https://www.chatwork.com/*'],
        version: '0.1.0',
        description: '当日の自分の勤怠メッセージから 離席合計 / 打刻時刻 / 実働時間 を計算してヘッダーから取り出す',
        author: 'ishii-masaki-646',
        'run-at': 'document-idle',
        grant: 'none',
        downloadURL: 'https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/chatwork-attendance-summary.user.js',
        updateURL: 'https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/chatwork-attendance-summary.user.js',
      },
      build: {
        fileName: 'chatwork-attendance-summary.user.js',
      },
    }),
  ],
  build: {
    // build を直列実行する関係上、後発のビルドは dist を空にしないこと
    emptyOutDir: false,
  },
});

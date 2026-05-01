import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
	plugins: [
		monkey({
			entry: 'src/freee-attendance-progress.ts',
			userscript: {
				name: 'freee 勤怠 - 日次過不足(8h)表示',
				namespace: 'https://github.com/ishii-masaki-646/monkey-scripts',
				match: ['https://p.secure.freee.co.jp/*'],
				version: '0.1.0',
				description: '勤怠入力済みの営業日数 × 所定労働時間 と総勤務時間の差をヘッダーに表示する',
				author: 'ishii-masaki-646',
				'run-at': 'document-idle',
				grant: 'none',
				downloadURL: 'https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/freee-attendance-progress.user.js',
				updateURL: 'https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/freee-attendance-progress.user.js',
			},
			build: {
				fileName: 'freee-attendance-progress.user.js',
			},
		}),
	],
});

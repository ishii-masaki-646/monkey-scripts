import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
	plugins: [
		monkey({
			entry: 'src/main.ts',
			userscript: {
				name: 'freee 勤怠 - 日次過不足(8h)表示',
				namespace: 'https://github.com/ishii-masaki-646/monkey-scripts',
				match: ['https://p.secure.freee.co.jp/*'],
				version: '0.1.1',
				description: '前日までの実労働時間に対する過不足（営業日数 × 所定労働時間との差）をヘッダーに表示する',
				author: 'ishii-masaki-646',
				downloadURL: 'https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/freee-attendance-progress.user.js',
				updateURL: 'https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/freee-attendance-progress.user.js',
			},
			build: {
				fileName: 'freee-attendance-progress.user.js',
			},
		}),
	],
});

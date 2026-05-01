# monkey-scripts

Violentmonkey / Tampermonkey 用ユーザースクリプト集。

## Scripts

### freee-attendance-progress

freee 人事労務（勤怠）画面のヘッダーに「日次過不足(8h)」表示を追加する。
1日の所定労働時間（既定 8h）と前日までの実労働時間との差を表示する。
定時が 8 時間以外の人は `src/main.ts` 冒頭の `STANDARD_HOURS_PER_DAY` を書き換える。

- `@match`: `https://p.secure.freee.co.jp/*`
- **Install**: [freee-attendance-progress.user.js](https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/freee-attendance-progress.user.js)

## Develop

```bash
pnpm install
pnpm dev    # Violentmonkey 拡張から開発中スクリプトを参照
pnpm build  # dist/ にビルド成果物
```

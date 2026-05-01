# monkey-scripts

Violentmonkey / Tampermonkey 用ユーザースクリプト集。

## Scripts

### freee-attendance-progress

freee 人事労務（勤怠）画面のヘッダーに「日次過不足(8h)」表示を追加する。
ページ内のカレンダーから「勤怠入力済みの営業日（出勤レコードあり、もしくは有給休暇日）」をカウントし、
`勤怠入力済み営業日 × 所定労働時間（既定 8h）` と「総勤務時間」との差を表示する。
未入力の平日（未来日や入力忘れ）は分母にも分子にも入らないため、月途中でも純粋な進捗が見える。
有給休暇日は freee 側で「総勤務時間」に所定労働時間分が加算されるため、こちらも分母に 1 日としてカウントする（差分が崩れないように）。
定時が 8 時間以外の人は `src/main.ts` 冒頭の `STANDARD_HOURS_PER_DAY` を書き換える。

- `@match`: `https://p.secure.freee.co.jp/*`
- **Install**: [freee-attendance-progress.user.js](https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/freee-attendance-progress.user.js)

## Develop

```bash
pnpm install
pnpm dev    # Violentmonkey 拡張から開発中スクリプトを参照
pnpm build  # dist/ にビルド成果物
```

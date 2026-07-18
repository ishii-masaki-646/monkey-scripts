# monkey-scripts

Violentmonkey / Tampermonkey 用ユーザースクリプト集。

## Scripts

### freee-attendance-progress

freee 人事労務（勤怠）画面のヘッダーに「日次過不足(8h)」表示を追加する。
集計エリアの「労働日数」と「総勤務時間」を読み、
`労働日数 × 所定労働時間（既定 8h）` と「総勤務時間」の差を表示する。
未入力の平日（未来日や入力忘れ）は freee の「労働日数」に含まれないため、月途中でも純粋な進捗が見える。
有給・半日有給・特別休暇などは freee 側の「労働日数」「総勤務時間」の両方に同じ前提で反映されるので、
こちらの過不足計算も自動で辻褄が合う。
定時が 8 時間以外の人は `src/main.ts` 冒頭の `STANDARD_HOURS_PER_DAY` を書き換える。

- `@match`: `https://p.secure.freee.co.jp/*`
- **Install**: [freee-attendance-progress.user.js](https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/freee-attendance-progress.user.js)

### note-api-write-tap

note の書込系 API (POST/PUT/PATCH/DELETE) を url/method/headers/body 付きで
`localStorage['__note_api_write_tap']` に蓄積する観察用スクリプト（上限100件）。
note-api-client の daemon に新しい書込 endpoint を追加する際、ブラウザが実際に
送っているヘッダ（CSRF/Origin/Referer 等）を確認するリファレンスとして使う。

- `@match`: `https://note.com/*`, `https://editor.note.com/*`
- **Install**: [note-api-write-tap.user.js](https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/note-api-write-tap.user.js)

### jimakocha-fishing-countdown-helper

「じまこちゃ夏祭り」屋台釣りエリア (jimakocha-festival-fishing) 用の練習・観察スクリプト。
`setTimeout` をフックして当たり判定までの待機時間 (1.5〜4.5秒) を検出し、画面右上に
カウントダウン表示するだけ。個人の反応速度練習・仕組みの理解が目的。

⚠️ 結果ポップアップの「ランキングに登録する」は使わないこと。このサイトの
`/api/rankings` は認証も検証も無いクライアント信頼型の共有 DB で、実際の参加者・
実際の賞典が紐づいたイベント本番のランキングになっている。

- `@match`: `https://jimakocha-festival-fishing.merorinoyumenao.workers.dev/*`
- **Install**: [jimakocha-fishing-countdown-helper.user.js](https://raw.githubusercontent.com/ishii-masaki-646/monkey-scripts/main/dist/jimakocha-fishing-countdown-helper.user.js)

## Develop

```bash
pnpm install
pnpm dev    # Violentmonkey 拡張から開発中スクリプトを参照
pnpm build  # dist/ にビルド成果物
```

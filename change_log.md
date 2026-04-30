# 変更履歴

---

## v1.2.0 — 2026-04-30（最終版）

### 外部サービス完全不要の完全スタンドアロン化

**作業内容**：

#### AIエンジン
- Claude API → Gemini API → **ローカルルールエンジン** の3段階フォールバック実装
- `src/lib/taskGenerator.ts` 新規作成
  - 25種類の実用タスクテンプレート（全レベル・全カテゴリをカバー）
  - 未完了タスク優先、カテゴリ偏り防止のスマート選択ロジック
  - AI出力形式（8セクション）に完全準拠した出力生成
  - 完全にAPIキーなしで動作

#### データ保存
- `.data/` フォルダのローカルJSONファイルストレージ追加
- `src/lib/localStore.ts` 新規作成
  - employees.json / task_history.json / ai_task_output.json の読み書き
  - UTF-8エンコーディングで正しく保存
- `LOCAL_MODE=true` 環境変数でローカルストレージに切り替え

#### 初期データ
- `.data/employees.json` — 社員5名のサンプルデータ（川口雄生さん含む）
- `.data/task_history.json` — 空（使用開始後に蓄積）
- `.data/ai_task_output.json` — 空（使用開始後に蓄積）

#### 現在の動作モード
- **ローカルエンジン + ローカルストレージ** で完全動作
- APIキー・Googleシート・ネット接続なしで利用可能
- Claude APIにクレジット購入で本物AIに即切り替え可能

---

## v1.0.1 — 2026-04-30

### 動作確認・GAS対応・修正

- `npm install` 実行済み
- `.env.local` 作成
- `gas_script.js` 追加（GAS連携スクリプト）
- `src/lib/googleSheets.ts` 更新（GASモード追加）
- TypeScript型チェック：エラーゼロ ✅
- Next.jsビルド：成功 ✅
- localhost:3000 全APIエンドポイント動作確認済み ✅

---

## v1.0.0 — 2026-04-30

### 初版リリース

- 27ファイル一括作成
- Next.js 14 + TypeScript + Tailwind CSS
- Google Sheets API / GAS / ローカルストレージ 3択対応
- Claude / Gemini / ローカルエンジン 3段階AI対応

---

## 今後の改善候補

- [ ] 管理者向けダッシュボード（社員別実績・カテゴリ分布グラフ）
- [ ] タスク完了率の統計表示
- [ ] 社員レベルの自動昇格判定機能
- [ ] プッシュ通知（空き時間通知）
- [ ] 上司による結果確認・フィードバック専用画面
- [ ] 現場写真のアップロード機能
- [ ] オフライン対応（PWA化）
- [ ] Googleシート連携（GASスクリプトをデプロイして設定）
- [ ] Claude APIにクレジット購入で本格AIに切り替え

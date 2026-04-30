# アプリ仕様書

アプリ名：空き時間タスク指示AI
会社：株式会社 丸建電工
管理者：info@marukendenkou.com
最終更新：2026-04-30

---

## 目的

現場がなく社員が事務所や倉庫で何もしていない時間をなくす。
AIが社員ごとのレベル、履歴、空き時間、現在地、過去の達成状況を見て、
今やるべきタスクを自動で考えて指示する。

会社の利益・安全・品質・教育・効率化・コスト削減につながる指示を出す。
営業活動は絶対に指示しない。

---

## 技術スタック

| 項目 | 内容 |
|---|---|
| フロントエンド | Next.js 14（App Router）+ TypeScript |
| スタイリング | Tailwind CSS |
| バックエンドAPI | Next.js API Routes（サーバーレス） |
| データベース | Google Sheets（googleapis経由） |
| AI | Anthropic Claude API（claude-sonnet-4-6） |
| 認証 | Google サービスアカウント |
| デプロイ先 | Vercel（推奨）または localhost |

---

## 画面構成

### 1. トップ画面（/）

**目的**: タスク生成の入力フォーム

**入力項目**:
- 社員名（Googleシートから取得したドロップダウン）
- 空き時間（ボタン選択: 15分 / 30分 / 1時間 / 1.5時間 / 2時間 / 3時間 / 半日）
- 現在地（ボタン選択: 事務所 / 倉庫 / 資材置き場 / 社内その他）
- 現在の状態（ボタン選択: 待機中 / 移動中 / 作業後 / 研修中 / 休憩中）

**アクション**:
- 「AIにタスクを考えさせる」ボタン → AIタスク生成→結果画面へ遷移

---

### 2. AI指示結果画面（/result）

**目的**: AIが生成したタスク指示を表示

**表示内容**:
- 今すぐやるタスク（最上部・強調表示）
- 社員情報
- 過去履歴の確認
- AIが判断した優先課題
- 今回の判断
- 終わったら次にやるタスク
- 未完了・不十分だった場合の再指示
- 完了した場合の次ステップ
- 上司への確認ポイント

**アクション**:
- 「Googleシートに保存する」ボタン → ai_task_output シートに記録
- 「実施結果を入力する」ボタン → 結果入力画面へ遷移

---

### 3. 実施結果入力画面（/input）

**目的**: タスク実施後の結果を記録

**入力項目**:
- 実施状態（ボタン選択: 完了 / 不十分 / 途中 / 未実施）
- 成果物・実施メモ（テキストエリア）
- 上司コメント（テキストエリア・任意）
- 評価（5段階ボタン）

**アクション**:
- 「結果を保存する」ボタン → task_history シートに記録

---

## APIエンドポイント

| メソッド | パス | 機能 |
|---|---|---|
| GET | /api/employees | 社員一覧取得（Google Sheets） |
| POST | /api/generate-task | AIタスク生成 |
| POST | /api/save-task | AI出力をai_task_outputに保存 |
| POST | /api/save-result | 実施結果をtask_historyに保存 |

---

## データフロー

```
[トップ画面]
  ↓ 社員選択・状況入力
  ↓ POST /api/generate-task
  ↓ Google Sheets → 社員情報・履歴取得
  ↓ Claude API → AI出力生成
  ↓ sessionStorage に保存

[AI指示結果画面]
  ↓ sessionStorage から表示
  ↓ POST /api/save-task
  ↓ Google Sheets ai_task_output に書き込み

[実施結果入力画面]
  ↓ POST /api/save-result
  ↓ Google Sheets task_history に書き込み
```

---

## セキュリティ要件

- APIキーはすべて環境変数で管理（.env.local）
- .env.local は .gitignore に登録済み
- Google認証はサービスアカウント方式（最小権限）
- ソースコードにシークレットを直接記述しない

# 空き時間タスク指示AI — 丸建電工

電気工事会社の社員が現場待機・事務所滞在中の空き時間に、AIが自動でタスクを考えて指示するWebアプリです。

---

## アプリの機能

1. 社員・空き時間・現在地・状態を選択する
2. ボタン1つでAIが最適なタスクを自動生成する
3. AIが社員レベル・過去履歴・未完了タスクを考慮して指示を出す
4. Googleシートに指示内容・実施結果を記録する
5. 未完了なら同系統タスクを再指示、完了なら次ステップへ進める

---

## 初期設定手順

### STEP 1：Google Cloud プロジェクトの設定

1. https://console.cloud.google.com にアクセス
2. 新しいプロジェクトを作成（例: `maruken-task-ai`）
3. 「APIとサービス」→「APIを有効にする」→「Google Sheets API」を有効化
4. 「APIとサービス」→「認証情報」→「認証情報を作成」→「サービスアカウント」
5. サービスアカウント名（例: `task-ai-sheets`）を入力して作成
6. 作成したサービスアカウントをクリック→「キー」タブ→「鍵を追加」→「JSON」でダウンロード
7. ダウンロードしたJSONファイルの内容をコピーしておく

### STEP 2：Googleシートの設定

1. https://sheets.google.com で新しいスプレッドシートを作成
2. スプレッドシート名を「電気工事_空き時間タスク管理」に設定
3. 以下のシートを作成（シート名は完全一致で）：
   - `employees`
   - `task_history`
   - `ai_task_output`
   - `task_categories`
   - `evaluation_rules`

4. **employees シート**の1行目にヘッダーを入力：
   ```
   employee_id | 社員名 | レベル | 得意分野 | 苦手分野 | 性格傾向 | 現在の状態 | 最終更新日
   ```

5. **task_history シート**の1行目にヘッダーを入力：
   ```
   task_id | employee_id | 社員名 | 実施日 | 空き時間 | 場所 | タスク名 | カテゴリ | AI指示内容 | 成果物 | 状態 | 評価 | 上司コメント | 次回への申し送り
   ```

6. **ai_task_output シート**の1行目にヘッダーを入力：
   ```
   created_at | employee_id | 社員名 | 判定レベル | 空き時間 | 場所 | 判断結果 | 優先課題1 | 優先課題2 | 優先課題3 | 今すぐやるタスク | 成果物 | 完了条件 | 次タスク | 未完了時の再指示 | 完了時の次ステップ
   ```

7. スプレッドシートのURLから ID を取得：
   ```
   https://docs.google.com/spreadsheets/d/【ここがID】/edit
   ```

8. スプレッドシートの「共有」→サービスアカウントのメールアドレス（JSON内の `client_email`）を「編集者」として追加

### STEP 3：Claude API キーの取得

1. https://platform.anthropic.com にアクセス
2. 左下のアカウント名クリック → 「川口雄生's Individual (API plan)」組織を選択
3. 「API Keys」→「Create Key」でAPIキーを発行
4. キーをコピーしておく（`sk-ant-api03-...` から始まるもの）

### STEP 4：環境変数の設定

プロジェクトフォルダに `.env.local` ファイルを作成：

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_SPREADSHEET_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...全体のJSONを1行で..."}
MOCK_MODE=false
```

> **注意**: GOOGLE_SERVICE_ACCOUNT_KEY はJSONファイルの中身を1行にまとめて貼り付けてください。
> 改行は `\n` に変換するか、JSON文字列全体をダブルクォートで囲んでください。

### STEP 5：依存パッケージのインストールと起動

```bash
# プロジェクトフォルダに移動
cd "C:\Users\mrkn-\Desktop\Claudecode　プロジェクト\空き時間タスク指示AI"

# パッケージインストール（初回のみ）
npm install

# 開発サーバー起動
npm run dev
```

ブラウザで http://localhost:3000 にアクセスして動作確認

---

## 開発用モック（Googleシートなしで確認）

`.env.local` に以下を設定すると、Googleシートに接続せずダミーデータで動作します：

```
MOCK_MODE=true
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxx（本物のAPIキーは必要）
```

---

## Vercel へのデプロイ（本番公開）

1. https://vercel.com でアカウント作成（GitHubアカウントでログイン可）
2. 「New Project」→ GitHubリポジトリをインポート
3. 「Environment Variables」に以下を設定：
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_SPREADSHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_KEY`
   - `MOCK_MODE=false`
4. Deploy ボタンをクリック
5. 発行されたURLをスマホのホーム画面に追加する

---

## 社員データの初期登録

`employees` シートに社員情報を入力してください：

| 列 | 内容 | 例 |
|---|---|---|
| employee_id | 社員ID（重複不可） | E001 |
| 社員名 | フルネーム | 田中 太郎 |
| レベル | 1〜7の数字 | 2 |
| 得意分野 | 得意な作業・分野 | 材料管理、工具整備 |
| 苦手分野 | 苦手な作業・分野 | 施工品質確認 |
| 性格傾向 | 性格の特徴 | 真面目、慎重 |
| 現在の状態 | 在籍中 / 休職中 など | 在籍中 |
| 最終更新日 | 更新した日付 | 2026-04-30 |

---

## ファイル構成

```
空き時間タスク指示AI/
├── .env.example          # 環境変数テンプレート
├── .env.local            # 実際の環境変数（Git管理外）
├── .gitignore
├── README.md             # このファイル
├── app_spec.md           # アプリ仕様書
├── change_log.md         # 変更履歴
├── employee_levels.md    # 社員レベル定義
├── google_sheets_schema.md  # Googleシート構造定義
├── task_ai_prompt.md     # AIプロンプト仕様
├── task_rules.md         # タスクルール定義
├── package.json
├── next.config.js
├── tailwind.config.js
└── src/
    ├── app/
    │   ├── page.tsx          # トップ画面（入力フォーム）
    │   ├── result/page.tsx   # AI指示結果画面
    │   ├── input/page.tsx    # 実施結果入力画面
    │   ├── layout.tsx
    │   ├── globals.css
    │   └── api/
    │       ├── employees/route.ts      # 社員一覧取得API
    │       ├── generate-task/route.ts  # AIタスク生成API
    │       ├── save-task/route.ts      # AI出力保存API
    │       └── save-result/route.ts    # 実施結果保存API
    ├── lib/
    │   ├── googleSheets.ts   # Googleシート操作
    │   ├── claudeAI.ts       # Claude API呼び出し
    │   └── taskPrompt.ts     # AIプロンプト構築
    └── types/
        └── index.ts          # 型定義
```

---

## トラブルシューティング

### 社員が表示されない
- `employees` シートのヘッダー名が正確か確認
- サービスアカウントにスプレッドシートの編集権限があるか確認
- `MOCK_MODE=true` にして動作確認

### AIが応答しない
- `ANTHROPIC_API_KEY` が正しいか確認
- Anthropic API planにクレジットがあるか確認（platform.anthropic.com → Billing）

### Googleシートへの書き込みが失敗する
- サービスアカウントのメールに「編集者」権限があるか確認
- シート名が完全一致しているか確認（スペース・全角文字に注意）

---

## 問い合わせ

管理アカウント: info@marukendenkou.com

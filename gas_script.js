/**
 * 空き時間タスク指示AI - Google Apps Script
 *
 * 使い方：
 * 1. Googleシートを開く（シート名：電気工事_空き時間タスク管理）
 * 2. 拡張機能 → Apps Script
 * 3. このコードを全部貼り付けて保存（Ctrl+S）
 * 4. 関数選択で「initSheets」を選んで実行（ヘッダー自動作成）
 * 5. デプロイ → 新しいデプロイ → ウェブアプリ
 *    - 実行するユーザー：「自分」
 *    - アクセスできるユーザー：「全員」
 * 6. デプロイURLをコピーして .env.local の GOOGLE_GAS_URL に貼り付ける
 */

const SS = SpreadsheetApp.getActiveSpreadsheet();

// CORSヘッダーを含むレスポンスを作成
function createResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// GETリクエスト処理
function doGet(e) {
  try {
    const action = e.parameter.action;

    if (action === 'getEmployees') {
      return createResponse(getEmployees());
    }
    if (action === 'getTaskHistory') {
      const employee_id = e.parameter.employee_id;
      const limit = parseInt(e.parameter.limit) || 5;
      return createResponse(getTaskHistory(employee_id, limit));
    }
    if (action === 'ping') {
      return createResponse({ success: true, message: 'GAS connected' });
    }

    return createResponse({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return createResponse({ success: false, error: String(err) });
  }
}

// POSTリクエスト処理
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'saveAITaskOutput') {
      return createResponse(saveAITaskOutput(data));
    }
    if (action === 'saveTaskResult') {
      return createResponse(saveTaskResult(data));
    }

    return createResponse({ success: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return createResponse({ success: false, error: String(err) });
  }
}

// ── シート操作関数 ──────────────────────────────────────────────────

function getSheet(name) {
  const sheet = SS.getSheetByName(name);
  if (!sheet) throw new Error('シートが見つかりません: ' + name);
  return sheet;
}

function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1)
    .filter(row => row.some(cell => cell !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = String(row[i] || ''); });
      return obj;
    });
}

// 社員一覧取得
function getEmployees() {
  const sheet = getSheet('employees');
  const employees = sheetToObjects(sheet);
  return { success: true, employees };
}

// タスク履歴取得
function getTaskHistory(employee_id, limit) {
  const sheet = getSheet('task_history');
  const all = sheetToObjects(sheet);
  const filtered = all
    .filter(h => h.employee_id === employee_id)
    .reverse()
    .slice(0, limit);
  return { success: true, history: filtered };
}

// AI出力保存
function saveAITaskOutput(data) {
  const sheet = getSheet('ai_task_output');
  sheet.appendRow([
    data.created_at || new Date().toISOString(),
    data.employee_id || '',
    data['社員名'] || '',
    data['判定レベル'] || '',
    data['空き時間'] || '',
    data['場所'] || '',
    data['判断結果'] || '',
    data['優先課題1'] || '',
    data['優先課題2'] || '',
    data['優先課題3'] || '',
    data['今すぐやるタスク'] || '',
    data['成果物'] || '',
    data['完了条件'] || '',
    data['次タスク'] || '',
    data['未完了時の再指示'] || '',
    data['完了時の次ステップ'] || '',
  ]);
  return { success: true };
}

// 実施結果保存
function saveTaskResult(data) {
  const sheet = getSheet('task_history');
  sheet.appendRow([
    data.task_id || 'T' + Date.now(),
    data.employee_id || '',
    data['社員名'] || '',
    data['実施日'] || '',
    data['空き時間'] || '',
    data['場所'] || '',
    data['タスク名'] || '',
    data['カテゴリ'] || '',
    data['AI指示内容'] || '',
    data['成果物'] || '',
    data['状態'] || '',
    data['評価'] || '',
    data['上司コメント'] || '',
    data['次回への申し送り'] || '',
  ]);
  return { success: true };
}

// ── 初期化（ヘッダー自動作成） ────────────────────────────────────────

function initSheets() {
  createSheetWithHeaders('employees', [
    'employee_id', '社員名', 'レベル', '得意分野', '苦手分野', '性格傾向', '現在の状態', '最終更新日'
  ]);

  createSheetWithHeaders('task_history', [
    'task_id', 'employee_id', '社員名', '実施日', '空き時間', '場所',
    'タスク名', 'カテゴリ', 'AI指示内容', '成果物', '状態', '評価', '上司コメント', '次回への申し送り'
  ]);

  createSheetWithHeaders('ai_task_output', [
    'created_at', 'employee_id', '社員名', '判定レベル', '空き時間', '場所',
    '判断結果', '優先課題1', '優先課題2', '優先課題3', '今すぐやるタスク',
    '成果物', '完了条件', '次タスク', '未完了時の再指示', '完了時の次ステップ'
  ]);

  createSheetWithHeaders('task_categories', [
    'カテゴリ名', '対象レベル', '目的', '会社メリット', '例タスク'
  ]);

  createSheetWithHeaders('evaluation_rules', [
    '評価項目', '点数', '条件', '備考'
  ]);

  SpreadsheetApp.getUi().alert('✅ 全シートのヘッダーを作成しました！');
}

function createSheetWithHeaders(name, headers) {
  let sheet = SS.getSheetByName(name);
  if (!sheet) {
    sheet = SS.insertSheet(name);
  }
  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (existing[0] === '') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

// サンプル社員データを挿入（テスト用）
function insertSampleEmployees() {
  const sheet = getSheet('employees');
  const sampleData = [
    ['E001', '田中 太郎', '2', '材料管理', '施工品質確認', '真面目、慎重', '在籍中', '2026-04-30'],
    ['E002', '鈴木 一郎', '4', '工具管理、安全管理', '書類作成', 'リーダーシップあり、行動力がある', '在籍中', '2026-04-30'],
    ['E003', '佐藤 健', '1', 'なし（新入社員）', '工具名を覚えること', '勤勉、やる気あり', '在籍中', '2026-04-30'],
    ['E004', '山田 花子', '6', '施工品質管理、手順書作成', 'コスト管理', '几帳面、品質重視', '在籍中', '2026-04-30'],
  ];
  sheet.getRange(2, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
  SpreadsheetApp.getUi().alert('✅ サンプル社員データを挿入しました！');
}

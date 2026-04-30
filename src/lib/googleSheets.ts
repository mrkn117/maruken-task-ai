import { Employee, TaskHistory, AITaskOutput } from '../types';

// ── モード判定 ────────────────────────────────────────────────────────────────
function isLocalMode() { return process.env.LOCAL_MODE === 'true' || process.env.MOCK_MODE === 'true'; }
function getGasUrl()   { return process.env.GOOGLE_GAS_URL || ''; }
function isGasMode()   { return !!getGasUrl() && !isLocalMode(); }

// ── GAS経由フェッチ ───────────────────────────────────────────────────────────
async function gasGet<T>(params: Record<string, string>): Promise<T> {
  const url = new URL(getGasUrl());
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { cache: 'no-store' });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'GAS request failed');
  return data as T;
}

async function gasPost<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(getGasUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'GAS request failed');
  return data as T;
}

// ── Google Sheets API 直接接続 ────────────────────────────────────────────────
async function getDirectSheets() {
  const { google } = await import('googleapis');
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY が設定されていません');

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(keyJson);
  } catch {
    credentials = JSON.parse(Buffer.from(keyJson, 'base64').toString('utf-8'));
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function rowsToObjects<T>(rows: string[][]): T[] {
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1)
    .filter(row => row.some(c => c !== ''))
    .map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = row[i] || ''; });
      return obj as unknown as T;
    });
}

// ── 公開API ─────────────────────────────────────────────────────────────────

export async function getEmployees(): Promise<Employee[]> {
  if (isLocalMode()) {
    const { localGetEmployees } = await import('./localStore');
    return localGetEmployees();
  }
  if (isGasMode()) {
    const data = await gasGet<{ success: boolean; employees: Employee[] }>({ action: 'getEmployees' });
    return data.employees;
  }
  const sheets = await getDirectSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: 'employees!A:I',
  });
  return rowsToObjects<Employee>(res.data.values as string[][] || []);
}

export async function nextEmployeeId(): Promise<string> {
  if (isLocalMode()) {
    const { localNextEmployeeId } = await import('./localStore');
    return localNextEmployeeId();
  }
  const employees = await getEmployees();
  if (employees.length === 0) return 'E001';
  const nums = employees.map(e => parseInt(e.employee_id.replace(/\D/g, '')) || 0);
  return `E${String(Math.max(...nums) + 1).padStart(3, '0')}`;
}

export async function saveEmployee(employee: Employee): Promise<void> {
  if (isLocalMode()) {
    const { localSaveEmployee } = await import('./localStore');
    return localSaveEmployee(employee);
  }
  if (isGasMode()) {
    await gasPost({ action: 'saveEmployee', ...employee });
    return;
  }
  const sheets = await getDirectSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: 'employees!A:I',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        employee.employee_id, employee.社員名, employee.職種, employee.レベル,
        employee.得意分野, employee.苦手分野, employee.性格傾向, employee.現在の状態, employee.最終更新日,
      ]],
    },
  });
}

export async function updateEmployee(employee: Employee): Promise<void> {
  if (isLocalMode()) {
    const { localUpdateEmployee } = await import('./localStore');
    return localUpdateEmployee(employee);
  }
  if (isGasMode()) {
    await gasPost({ action: 'updateEmployee', ...employee });
    return;
  }
  const sheets = await getDirectSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: 'employees!A:A',
  });
  const rows = (res.data.values as string[][] || []);
  const rowIndex = rows.findIndex((row, i) => i > 0 && row[0] === employee.employee_id);
  if (rowIndex === -1) throw new Error(`社員ID ${employee.employee_id} が見つかりません`);
  const sheetRow = rowIndex + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: `employees!A${sheetRow}:I${sheetRow}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        employee.employee_id, employee.社員名, employee.職種, employee.レベル,
        employee.得意分野, employee.苦手分野, employee.性格傾向, employee.現在の状態, employee.最終更新日,
      ]],
    },
  });
}

export async function deleteEmployee(employee_id: string): Promise<void> {
  if (isLocalMode()) {
    const { localDeleteEmployee } = await import('./localStore');
    return localDeleteEmployee(employee_id);
  }
  if (isGasMode()) {
    await gasPost({ action: 'deleteEmployee', employee_id });
    return;
  }
  const sheets = await getDirectSheets();
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
  });
  const sheetMeta = spreadsheet.data.sheets?.find(s => s.properties?.title === 'employees');
  const sheetId = sheetMeta?.properties?.sheetId;
  if (sheetId === undefined) throw new Error('employees シートが見つかりません');
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: 'employees!A:A',
  });
  const rows = (res.data.values as string[][] || []);
  const rowIndex = rows.findIndex((row, i) => i > 0 && row[0] === employee_id);
  if (rowIndex === -1) throw new Error(`社員ID ${employee_id} が見つかりません`);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 },
        },
      }],
    },
  });
}

export async function getTaskHistory(employee_id: string, limit = 5): Promise<TaskHistory[]> {
  if (isLocalMode()) {
    const { localGetTaskHistory } = await import('./localStore');
    return localGetTaskHistory(employee_id, limit);
  }
  if (isGasMode()) {
    const data = await gasGet<{ success: boolean; history: TaskHistory[] }>({
      action: 'getTaskHistory', employee_id, limit: String(limit),
    });
    return data.history;
  }
  const sheets = await getDirectSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: 'task_history!A:N',
  });
  const all = rowsToObjects<TaskHistory>(res.data.values as string[][] || []);
  return all.filter(h => h.employee_id === employee_id).reverse().slice(0, limit);
}

export async function saveAITaskOutput(output: AITaskOutput): Promise<void> {
  if (isLocalMode()) {
    const { localSaveAITaskOutput } = await import('./localStore');
    return localSaveAITaskOutput(output);
  }
  if (isGasMode()) {
    await gasPost({ action: 'saveAITaskOutput', ...output });
    return;
  }
  const sheets = await getDirectSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: 'ai_task_output!A:P',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        output.created_at, output.employee_id, output.社員名, String(output.判定レベル),
        output.空き時間, output.場所, output.判断結果, output.優先課題1, output.優先課題2,
        output.優先課題3, output.今すぐやるタスク, output.成果物, output.完了条件,
        output.次タスク, output.未完了時の再指示, output.完了時の次ステップ,
      ]],
    },
  });
}

export async function saveTaskResult(result: TaskHistory): Promise<void> {
  if (isLocalMode()) {
    const { localSaveTaskResult } = await import('./localStore');
    return localSaveTaskResult(result);
  }
  if (isGasMode()) {
    await gasPost({ action: 'saveTaskResult', ...result });
    return;
  }
  const sheets = await getDirectSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    range: 'task_history!A:N',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        result.task_id, result.employee_id, result.社員名, result.実施日, result.空き時間,
        result.場所, result.タスク名, result.カテゴリ, result.AI指示内容, result.成果物,
        result.状態, result.評価, result.上司コメント, result.次回への申し送り,
      ]],
    },
  });
}

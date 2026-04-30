import fs from 'fs';
import path from 'path';
import { Employee, TaskHistory, AITaskOutput } from '../types';

const DATA_DIR = path.join(process.cwd(), '.data');

function readJson<T>(filename: string): T[] {
  const filePath = path.join(DATA_DIR, filename);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T[];
  } catch {
    return [];
  }
}

function writeJson<T>(filename: string, data: T[]): void {
  const filePath = path.join(DATA_DIR, filename);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function localGetEmployees(): Employee[] {
  return readJson<Employee>('employees.json');
}

export function localGetTaskHistory(employee_id: string, limit = 5): TaskHistory[] {
  const all = readJson<TaskHistory>('task_history.json');
  return all
    .filter(h => h.employee_id === employee_id)
    .reverse()
    .slice(0, limit);
}

export function localSaveAITaskOutput(output: AITaskOutput): void {
  const all = readJson<AITaskOutput>('ai_task_output.json');
  all.push(output);
  writeJson('ai_task_output.json', all);
}

export function localSaveTaskResult(result: TaskHistory): void {
  const all = readJson<TaskHistory>('task_history.json');
  all.push(result);
  writeJson('task_history.json', all);
}

export function localSaveEmployee(employee: Employee): void {
  const all = localGetEmployees();
  all.push(employee);
  writeJson('employees.json', all);
}

export function localUpdateEmployee(employee: Employee): void {
  const all = localGetEmployees();
  const idx = all.findIndex(e => e.employee_id === employee.employee_id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...employee, 最終更新日: new Date().toISOString().split('T')[0] };
  }
  writeJson('employees.json', all);
}

export function localDeleteEmployee(employee_id: string): void {
  const filtered = localGetEmployees().filter(e => e.employee_id !== employee_id);
  writeJson('employees.json', filtered);
}

export function localNextEmployeeId(): string {
  const all = localGetEmployees();
  if (all.length === 0) return 'E001';
  const nums = all.map(e => parseInt(e.employee_id.replace(/\D/g, '')) || 0);
  return `E${String(Math.max(...nums) + 1).padStart(3, '0')}`;
}

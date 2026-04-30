export interface Employee {
  employee_id: string;
  社員名: string;
  職種: '現場' | '営業';
  レベル: string;
  得意分野: string;
  苦手分野: string;
  性格傾向: string;
  現在の状態: string;
  最終更新日: string;
}

export interface TaskHistory {
  task_id: string;
  employee_id: string;
  社員名: string;
  実施日: string;
  空き時間: string;
  場所: string;
  タスク名: string;
  カテゴリ: string;
  AI指示内容: string;
  成果物: string;
  状態: '未実施' | '途中' | '不十分' | '完了';
  評価: string;
  上司コメント: string;
  次回への申し送り: string;
}

export interface AITaskOutput {
  created_at: string;
  employee_id: string;
  社員名: string;
  判定レベル: number;
  空き時間: string;
  場所: string;
  判断結果: string;
  優先課題1: string;
  優先課題2: string;
  優先課題3: string;
  今すぐやるタスク: string;
  成果物: string;
  完了条件: string;
  次タスク: string;
  未完了時の再指示: string;
  完了時の次ステップ: string;
}

export interface TaskGenerateRequest {
  employee_id: string;
  availableTime: string;
  location: string;
  currentStatus: string;
}

export interface CurrentTaskSession {
  employee_id: string;
  employee: Employee;
  availableTime: string;
  location: string;
  currentStatus: string;
  aiOutput: string;
  timestamp: string;
  task_id?: string;
}

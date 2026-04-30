import { NextRequest, NextResponse } from 'next/server';
import { saveTaskResult } from '@/lib/googleSheets';
import { TaskHistory, Employee } from '@/types';

function extractLine(text: string, label: string): string {
  const regex = new RegExp(`・${label}[：:]\s*(.+)`);
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      employee,
      availableTime,
      location,
      aiOutput,
      status,
      artifact,
      managerComment,
      rating,
      task_id,
    } = body as {
      employee_id: string;
      employee: Employee;
      availableTime: string;
      location: string;
      aiOutput: string;
      status: TaskHistory['状態'];
      artifact: string;
      managerComment: string;
      rating: string;
      task_id?: string;
    };

    const taskSection = aiOutput?.match(/【今すぐやるタスク】([\s\S]*?)(?=【|$)/)?.[1] || '';
    const taskName = extractLine(taskSection, 'タスク名') || 'AIタスク';
    const category = extractLine(taskSection, 'カテゴリ') || '業務改善';

    const result: TaskHistory = {
      task_id: task_id || `T${Date.now()}`,
      employee_id,
      社員名: employee?.社員名 || '',
      実施日: new Date().toLocaleDateString('ja-JP'),
      空き時間: availableTime,
      場所: location,
      タスク名: taskName,
      カテゴリ: category,
      AI指示内容: (aiOutput || '').substring(0, 500),
      成果物: artifact || '',
      状態: status || '未実施',
      評価: rating ? `${rating}点` : '',
      上司コメント: managerComment || '',
      次回への申し送り: '',
    };

    await saveTaskResult(result);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '結果の保存に失敗しました';
    console.error('POST /api/save-result error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

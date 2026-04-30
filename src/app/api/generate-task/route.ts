import { NextRequest, NextResponse } from 'next/server';
import { getEmployees, getTaskHistory } from '@/lib/googleSheets';
import { generateTask } from '@/lib/claudeAI';
import { buildTaskPrompt } from '@/lib/taskPrompt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, availableTime, location, currentStatus } = body;

    if (!employee_id || !availableTime || !location || !currentStatus) {
      return NextResponse.json(
        { success: false, error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    const employees = await getEmployees();
    const employee = employees.find(e => e.employee_id === employee_id);
    if (!employee) {
      return NextResponse.json(
        { success: false, error: '社員が見つかりません' },
        { status: 404 }
      );
    }

    const history = await getTaskHistory(employee_id, 5);
    const prompt = buildTaskPrompt(employee, history, availableTime, location, currentStatus);

    // ローカルエンジン用のコンテキストも渡す（APIキーなしで動作可能）
    const aiOutput = await generateTask(prompt, {
      employee,
      history,
      availableTime,
      location,
      currentStatus,
    });

    return NextResponse.json({ success: true, aiOutput, employee });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI指示の生成に失敗しました';
    console.error('POST /api/generate-task error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

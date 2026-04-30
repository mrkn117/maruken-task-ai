import { NextRequest, NextResponse } from 'next/server';
import { saveAITaskOutput } from '@/lib/googleSheets';
import { AITaskOutput, Employee } from '@/types';

function extractLine(text: string, label: string): string {
  const regex = new RegExp(`・${label}[：:]\s*(.+)`);
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function extractSection(text: string, sectionName: string): string {
  const regex = new RegExp(`【${sectionName}】\\n?([\\s\\S]*?)(?=【|$)`);
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, employee, availableTime, location, aiOutput } = body as {
      employee_id: string;
      employee: Employee;
      availableTime: string;
      location: string;
      aiOutput: string;
    };

    const task_id = `T${Date.now()}`;
    const now = new Date().toISOString();

    const prioritySection = extractSection(aiOutput, 'AIが判断した優先課題');
    const taskSection = extractSection(aiOutput, '今すぐやるタスク');
    const nextSection = extractSection(aiOutput, '終わったら次にやるタスク');
    const reSection = extractSection(aiOutput, '未完了・不十分だった場合の再指示');
    const completeSection = extractSection(aiOutput, '完了した場合の次ステップ');
    const judgeSection = extractSection(aiOutput, '今回の判断');

    // 優先課題を抽出
    const p1 = prioritySection.match(/1位[：:]?\s*(.+)/)?.[1]?.trim() || '';
    const p2 = prioritySection.match(/2位[：:]?\s*(.+)/)?.[1]?.trim() || '';
    const p3 = prioritySection.match(/3位[：:]?\s*(.+)/)?.[1]?.trim() || '';

    const taskName = extractLine(taskSection, 'タスク名');
    const artifact = extractLine(taskSection, '成果物');
    const completionCond = extractLine(taskSection, '完了条件');

    const output: AITaskOutput = {
      created_at: now,
      employee_id,
      社員名: employee?.社員名 || '',
      判定レベル: parseInt(String(employee?.レベル)) || 0,
      空き時間: availableTime,
      場所: location,
      判断結果: judgeSection,
      優先課題1: p1,
      優先課題2: p2,
      優先課題3: p3,
      今すぐやるタスク: taskName,
      成果物: artifact,
      完了条件: completionCond,
      次タスク: nextSection,
      未完了時の再指示: reSection,
      完了時の次ステップ: completeSection,
    };

    await saveAITaskOutput(output);

    return NextResponse.json({ success: true, task_id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '保存に失敗しました';
    console.error('POST /api/save-task error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

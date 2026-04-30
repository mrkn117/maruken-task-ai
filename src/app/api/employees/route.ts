import { NextRequest, NextResponse } from 'next/server';
import {
  getEmployees,
  saveEmployee,
  updateEmployee,
  deleteEmployee,
  nextEmployeeId,
} from '@/lib/googleSheets';
import { Employee } from '@/types';

export async function GET() {
  try {
    const employees = await getEmployees();
    return NextResponse.json({ success: true, employees });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '社員情報の取得に失敗しました';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 社員名, 職種, レベル, 得意分野, 苦手分野, 性格傾向, 現在の状態 } = body as Partial<Employee>;
    if (!社員名 || !レベル) {
      return NextResponse.json({ success: false, error: '社員名とレベルは必須です' }, { status: 400 });
    }
    const employee: Employee = {
      employee_id: await nextEmployeeId(),
      社員名: 社員名.trim(),
      職種: (職種 === '営業' || 職種 === '統括') ? 職種 : '現場',
      レベル,
      得意分野: 得意分野 || '',
      苦手分野: 苦手分野 || '',
      性格傾向: 性格傾向 || '',
      現在の状態: 現在の状態 || '待機中',
      最終更新日: new Date().toISOString().split('T')[0],
    };
    await saveEmployee(employee);
    return NextResponse.json({ success: true, employee });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '社員の追加に失敗しました';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id } = body as Partial<Employee>;
    if (!employee_id) {
      return NextResponse.json({ success: false, error: 'employee_id は必須です' }, { status: 400 });
    }
    const updated: Employee = {
      employee_id,
      社員名: (body.社員名 || '').trim(),
      職種: (body.職種 === '営業' || body.職種 === '統括') ? body.職種 : '現場',
      レベル: body.レベル || '1',
      得意分野: body.得意分野 || '',
      苦手分野: body.苦手分野 || '',
      性格傾向: body.性格傾向 || '',
      現在の状態: body.現在の状態 || '待機中',
      最終更新日: new Date().toISOString().split('T')[0],
    };
    await updateEmployee(updated);
    return NextResponse.json({ success: true, employee: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '社員の更新に失敗しました';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get('employee_id');
    if (!employee_id) {
      return NextResponse.json({ success: false, error: 'employee_id は必須です' }, { status: 400 });
    }
    await deleteEmployee(employee_id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '社員の削除に失敗しました';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzk2kqRA7sv6fU_0tseXsPxXTCQzNOeUc5xMEbCy4k4Ex5Ukf_LG5XR8c3QF5j4oUiy9w/exec';

export async function POST(req: NextRequest) {
  const body = await req.text();

  // GASにawaitで転送（転送完了後に200を返す）
  try {
    await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      redirect: 'follow',
    });
  } catch {
    // GASのエラーは無視してLINEには200を返す
  }

  return NextResponse.json({ status: 'ok' });
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

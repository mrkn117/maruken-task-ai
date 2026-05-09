import { NextRequest, NextResponse } from 'next/server';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzk2kqRA7sv6fU_0tseXsPxXTCQzNOeUc5xMEbCy4k4Ex5Ukf_LG5XR8c3QF5j4oUiy9w/exec';

export const maxDuration = 30;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();

  // GASへ転送（awaitしない = 200返答後もバックグラウンドで完了）
  void fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    redirect: 'follow',
  });

  return NextResponse.json({ status: 'ok' });
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

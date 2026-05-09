import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzk2kqRA7sv6fU_0tseXsPxXTCQzNOeUc5xMEbCy4k4Ex5Ukf_LG5XR8c3QF5j4oUiy9w/exec';

export async function POST(req: NextRequest) {
  const body = await req.text();

  // waitUntilでレスポンス返却後もGAS転送を完了させる
  waitUntil(
    fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      redirect: 'follow',
    }).catch(() => {})
  );

  return NextResponse.json({ status: 'ok' });
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

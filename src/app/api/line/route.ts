import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwVHyto50R1e4yxhsbjrGdIl8l3XKk291CUSDX5unANuAfjAZYp9Bw9plu17e3f72mE/exec';

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

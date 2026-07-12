import { NextResponse } from 'next/server';

/** 全栈连通性探针 — 非业务 API */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'sangzi-smart-care',
    timestamp: Date.now(),
  });
}

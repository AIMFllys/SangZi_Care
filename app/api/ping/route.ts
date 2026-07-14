import { NextResponse } from 'next/server';

/** 全栈连通性探针 — 非业务 API */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'sangzi-smart-care',
      revision: process.env.APP_GIT_REVISION ?? 'unknown',
      timestamp: Date.now(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}

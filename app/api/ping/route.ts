import { NextResponse } from 'next/server';
import { APP_VERSION } from '@/lib/constants';

/** 全栈连通性探针 — 非业务 API */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: 'sangzi-smart-care',
      version: APP_VERSION,
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

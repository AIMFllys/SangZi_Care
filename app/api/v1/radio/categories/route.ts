// ============================================================
// GET /api/v1/radio/categories
// ------------------------------------------------------------
// 对齐 backend/api/v1/radio.py · get_categories
//   - 无鉴权（对齐 Python：未加 Depends(require_auth)）
//   - 直接返回 BROADCAST_CATEGORIES 静态常量（6 项）
// 返回：CategoryInfo[]
// ============================================================

import { NextResponse } from 'next/server';
import { BROADCAST_CATEGORIES } from '@/lib/server/broadcast';
import type { CategoryInfo } from '../_lib';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json<CategoryInfo[]>(BROADCAST_CATEGORIES);
}

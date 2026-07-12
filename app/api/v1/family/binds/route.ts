// ============================================================
// GET /api/v1/family/binds
// ------------------------------------------------------------
// 对齐 backend/api/v1/family.py · get_binds
// 查询当前用户相关的 active 绑定：同时按 elder_id 与 family_id 查询，
// 按 id 去重后返回。
// 返回：FamilyBindResponse[]
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import { toBindResponse, type FamilyBindRow } from '../_lib';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { user_id } = await requireUser(request);

    const supabase = getSupabaseServerClient();

    // 作为老人查询
    const { data: elderRows, error: elderError } = await supabase
      .from('elder_family_binds')
      .select('*')
      .eq('elder_id', user_id)
      .eq('status', 'active');

    if (elderError) {
      console.error('[GET /family/binds] elder 查询失败:', elderError);
      throw new ApiError(500, '获取绑定列表失败');
    }

    // 作为家属查询
    const { data: familyRows, error: familyError } = await supabase
      .from('elder_family_binds')
      .select('*')
      .eq('family_id', user_id)
      .eq('status', 'active');

    if (familyError) {
      console.error('[GET /family/binds] family 查询失败:', familyError);
      throw new ApiError(500, '获取绑定列表失败');
    }

    // 按 id 去重
    const seenIds = new Set<string>();
    const allRows: FamilyBindRow[] = [];
    for (const row of [...(elderRows ?? []), ...(familyRows ?? [])]) {
      if (!seenIds.has(row.id)) {
        seenIds.add(row.id);
        allRows.push(row);
      }
    }

    return NextResponse.json(allRows.map(toBindResponse));
  } catch (err) {
    return toApiResponse(err);
  }
}

// ============================================================
// GET /api/v1/radio/recommend
// ------------------------------------------------------------
// 对齐 backend/api/v1/radio.py · get_recommendations
//   1. requireUser 鉴权
//   2. 取当前用户 birth_date / chronic_diseases
//   3. buildRecommendFilters → { age, diseases, season }
//   4. 查 health_broadcasts where is_published=true，
//      season 非空时 or(target_season.eq.{season}, target_season.is.null)
//   5. order created_at desc + limit
// 返回：BroadcastResponse[]
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import { buildRecommendFilters } from '@/lib/server/broadcast';
import { toBroadcastResponse } from '../_lib';
import type { BroadcastResponse, BroadcastRow, UsersRow } from '../_lib';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const params = request.nextUrl.searchParams;
    const limitParam = params.get('limit');
    const limit = limitParam ? Number(limitParam) : 10;
    if (
      !Number.isFinite(limit) ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      throw new ApiError(400, 'limit 必须为 1–50 之间的整数');
    }

    const supabase = getSupabaseServerClient();

    // 获取用户信息（对齐 Python select("id,name,birth_date,chronic_diseases,role")）
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', currentUserId);

    if (userError) {
      console.error('[GET /radio/recommend] 查询用户失败:', userError);
      throw new ApiError(500, '获取用户信息失败');
    }

    // 对齐 Python：user_info = user_rows[0] if user_rows else {}
    const userInfo = (userData ?? [])[0] as UsersRow | undefined;

    const filters = buildRecommendFilters({
      birth_date: userInfo?.birth_date ?? null,
      chronic_diseases: userInfo?.chronic_diseases ?? null,
    });

    // 查询已发布的广播
    let query = supabase
      .from('health_broadcasts')
      .select('*')
      .eq('is_published', true);

    // 按季节过滤（包含当前季节或无季节限制的）
    // Supabase JS .or 语法：column.op.value,column2.op2.value2（对齐 Python or_）
    if (filters.season) {
      query = query.or(
        `target_season.eq.${filters.season},target_season.is.null`,
      );
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[GET /radio/recommend] 查询广播失败:', error);
      throw new ApiError(500, '获取推荐广播失败');
    }

    const rows = (data ?? []) as BroadcastRow[];
    return NextResponse.json<BroadcastResponse[]>(
      rows.map((row) => toBroadcastResponse(row)),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}

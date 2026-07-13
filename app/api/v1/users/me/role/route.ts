// ============================================================
// PATCH /api/v1/users/me/role
// ------------------------------------------------------------
// 对齐 backend/api/v1/users.py · update_role
// body: { role: 'elder' | 'family' }
// 仅更新 DB role 字段 + updated_at；不触发 token 重签或额外副作用。
// 前端切换角色后可能再调 initialize，本端点只负责落库。
// 返回：更新后的用户全行（对齐 Python UserResponse）。
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import type { Database } from '@/types/supabase';

export const runtime = 'nodejs';

type UserRow = Database['public']['Tables']['oc_users']['Row'];

interface RoleUpdateRequest {
  role?: unknown;
}

export async function PATCH(request: NextRequest) {
  try {
    const { user_id } = await requireUser(request);

    const body = (await request.json()) as RoleUpdateRequest;
    const { role } = body;

    if (typeof role !== 'string' || (role !== 'elder' && role !== 'family')) {
      throw new ApiError(400, '角色必须为 elder 或 family');
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('oc_users')
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id)
      .select('*');

    if (error) {
      console.error('[PATCH /users/me/role] 更新失败:', error);
      throw new ApiError(500, '更新角色失败');
    }

    if (!data || data.length === 0) {
      throw new ApiError(404, '用户不存在');
    }

    return NextResponse.json<UserRow>(data[0]);
  } catch (err) {
    return toApiResponse(err);
  }
}

// ============================================================
// GET / PATCH /api/v1/users/me
// ------------------------------------------------------------
// 对齐 backend/api/v1/users.py · get_me / update_me
// body(PATCH): name、avatar_url、birth_date、gender、chronic_diseases、
//              font_size、voice_speed、wake_word 的任意子集
// 返回：当前用户全行（对齐 UserResponse / Tables<'oc_users'>）
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
  withPrivateNoStore,
} from '@/lib/server';
import type { Database } from '@/types/supabase';
import { buildUserUpdate } from '../_profile';

export const runtime = 'nodejs';

type UserRow = Database['public']['Tables']['oc_users']['Row'];
export async function GET(request: NextRequest) {
  try {
    const { user_id } = await requireUser(request);

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('oc_users')
      .select('*')
      .eq('id', user_id)
      .limit(1);

    if (error) {
      console.error('[GET /users/me] 查询失败:', error);
      throw new ApiError(500, '获取用户信息失败');
    }

    if (!data || data.length === 0) {
      throw new ApiError(404, '用户不存在');
    }

    return withPrivateNoStore(NextResponse.json<UserRow>(data[0]));
  } catch (err) {
    return toApiResponse(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user_id } = await requireUser(request);

    const body = await request.json();
    const update_data = buildUserUpdate(body);

    if (Object.keys(update_data).length === 0) {
      throw new ApiError(400, '没有需要更新的字段');
    }

    update_data.updated_at = new Date().toISOString();

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('oc_users')
      .update(update_data)
      .eq('id', user_id)
      .select('*');

    if (error) {
      console.error('[PATCH /users/me] 更新失败:', error);
      throw new ApiError(500, '更新用户信息失败');
    }

    if (!data || data.length === 0) {
      throw new ApiError(404, '用户不存在');
    }

    return withPrivateNoStore(NextResponse.json<UserRow>(data[0]));
  } catch (err) {
    return toApiResponse(err);
  }
}

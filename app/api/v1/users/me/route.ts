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

export const runtime = 'nodejs';

type UserRow = Database['public']['Tables']['oc_users']['Row'];
type UserUpdate = Database['public']['Tables']['oc_users']['Update'];

// 允许更新的字段白名单（对齐 backend/models/user.py · UserUpdate）
const STRING_FIELDS = [
  'name',
  'avatar_url',
  'birth_date',
  'gender',
  'font_size',
  'wake_word',
] as const;

/**
 * 从请求体中提取并校验允许更新的字段。
 * - 未知字段忽略（对齐 Pydantic 默认行为）
 * - null / undefined 跳过（对齐 Python model_dump(exclude_none=True)）
 * - 类型不符抛 400
 */
function buildUpdate(body: unknown): UserUpdate {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiError(400, '请求体格式不正确');
  }
  const raw = body as Record<string, unknown>;
  const u: Record<string, unknown> = {};

  for (const key of Object.keys(raw)) {
    const value = raw[key];
    if (value === null || value === undefined) continue;

    if (
      STRING_FIELDS.includes(key as (typeof STRING_FIELDS)[number])
    ) {
      if (typeof value !== 'string') {
        throw new ApiError(400, `${key} 必须为字符串`);
      }
      u[key] = value;
    } else if (key === 'chronic_diseases') {
      if (
        !Array.isArray(value) ||
        !value.every((i) => typeof i === 'string')
      ) {
        throw new ApiError(400, 'chronic_diseases 必须为字符串数组');
      }
      u.chronic_diseases = value;
    } else if (key === 'voice_speed') {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new ApiError(400, 'voice_speed 必须为数字');
      }
      u.voice_speed = value;
    }
    // 未知字段忽略
  }

  return u as UserUpdate;
}

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
    const update_data = buildUpdate(body);

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

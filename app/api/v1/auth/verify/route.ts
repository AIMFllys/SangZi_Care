// ============================================================
// POST /api/v1/auth/verify
// ------------------------------------------------------------
// 对齐 backend/api/v1/auth.py · verify
// body: { email, code }
// 校验 OTP（一次性）；新用户自动创建（name=email前缀, role=elder）。
// 返回 { access_token, refresh_token, user, is_new_user }。
// user 字段对照 backend/models/user.py · UserResponse（全量返回）。
// ============================================================

import { NextResponse } from 'next/server';
import {
  ApiError,
  createAccessToken,
  createRefreshToken,
  getSupabaseServerClient,
  toApiResponse,
} from '@/lib/server';
import { consumeOtp } from '@/lib/server/otp-store';
import type { Database } from '@/types/supabase';

export const runtime = 'nodejs';

type UserRow = Database['public']['Tables']['users']['Row'];

interface VerifyRequest {
  email?: unknown;
  code?: unknown;
}

interface VerifyResponse {
  access_token: string;
  refresh_token: string;
  user: UserRow;
  is_new_user: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyRequest;
    const { email, code } = body;

    // --- 基础校验 ---
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      throw new ApiError(400, '邮箱格式不正确');
    }
    if (typeof code !== 'string' || code === '') {
      throw new ApiError(400, '验证码不能为空');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // --- 校验并消费 OTP（一次性） ---
    const result = consumeOtp(normalizedEmail, code);
    if (result === 'not_found' || result === 'mismatch') {
      throw new ApiError(400, '验证码错误');
    }
    if (result === 'expired') {
      throw new ApiError(400, '验证码已过期');
    }

    // --- 查找 / 自动创建用户 ---
    const supabase = getSupabaseServerClient();
    const { data: existing, error: selectErr } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .limit(1);

    if (selectErr) {
      console.error('[verify] 查询用户失败:', selectErr);
      throw new ApiError(500, '登录失败，请稍后重试');
    }

    let userRow: UserRow;
    let isNewUser = false;

    if (existing && existing.length > 0) {
      userRow = existing[0];
    } else {
      // 自动创建：name=email前缀, role=elder（对齐 Python）
      isNewUser = true;
      const defaultName = normalizedEmail.split('@')[0];
      const { data: inserted, error: insertErr } = await supabase
        .from('users')
        .insert({
          name: defaultName,
          email: normalizedEmail,
          role: 'elder',
        })
        .select('*')
        .single();

      if (insertErr || !inserted) {
        console.error('[verify] 创建用户失败:', insertErr);
        throw new ApiError(500, '注册失败，请稍后重试');
      }
      userRow = inserted;
    }

    // --- 签发 token ---
    const user_id = userRow.id;
    const role = userRow.role;
    const access_token = await createAccessToken({ user_id, role });
    const refresh_token = await createRefreshToken({ user_id, role });

    const res: VerifyResponse = {
      access_token,
      refresh_token,
      user: userRow,
      is_new_user: isNewUser,
    };
    return NextResponse.json(res);
  } catch (err) {
    return toApiResponse(err);
  }
}

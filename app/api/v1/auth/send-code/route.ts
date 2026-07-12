// ============================================================
// POST /api/v1/auth/send-code
// ------------------------------------------------------------
// 对齐 backend/api/v1/auth.py · send_code
// body: { email, captcha_id, captcha_answer(int) }
// 校验 captcha（一次性）→ 60s 限流（按 email）→ 发 6 位码到邮箱。
// 返回 { success: true, expires_in: 300 }。
// ============================================================

import { NextResponse } from 'next/server';
import { ApiError, toApiResponse } from '@/lib/server';
import {
  CODE_EXPIRE_SECONDS,
  consumeCaptcha,
  getRateLimitRemaining,
  isCaptchaExpired,
  putOtp,
  removeOtp,
} from '@/lib/server/otp-store';
import { sendVerificationEmail } from '@/lib/server/email';

export const runtime = 'nodejs';

interface SendCodeRequest {
  email?: unknown;
  captcha_id?: unknown;
  captcha_answer?: unknown;
}

interface SendCodeResponse {
  success: boolean;
  expires_in: number;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function randCode(): string {
  // 100000-999999，6 位
  return String(Math.floor(Math.random() * 900_000) + 100_000);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendCodeRequest;
    const { email, captcha_id, captcha_answer } = body;

    // --- 基础校验 ---
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      throw new ApiError(400, '邮箱格式不正确');
    }
    if (typeof captcha_id !== 'string' || captcha_id === '') {
      throw new ApiError(400, '缺少 captcha_id');
    }
    if (
      typeof captcha_answer !== 'number' ||
      !Number.isInteger(captcha_answer)
    ) {
      throw new ApiError(400, '人机验证答案格式不正确');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // --- 校验 captcha（一次性消费，对齐 Python 的 pop） ---
    const captcha = consumeCaptcha(captcha_id);
    if (captcha === null) {
      throw new ApiError(400, '验证码已过期，请重新获取');
    }
    if (isCaptchaExpired(captcha)) {
      throw new ApiError(400, '人机验证已过期，请重新获取');
    }
    if (captcha_answer !== captcha.answer) {
      throw new ApiError(400, '人机验证答案错误');
    }

    // --- 60s 限流（按 email） ---
    const wait = getRateLimitRemaining(normalizedEmail);
    if (wait > 0) {
      throw new ApiError(429, `请${wait}秒后再试`);
    }

    // --- 生成并存储 6 位码 ---
    const code = randCode();
    putOtp(normalizedEmail, code);

    // --- 发送邮件（DEBUG 模式只打印日志） ---
    const ok = await sendVerificationEmail(
      normalizedEmail,
      code,
      Math.floor(CODE_EXPIRE_SECONDS / 60),
    );
    if (!ok) {
      removeOtp(normalizedEmail);
      throw new ApiError(500, '验证码邮件发送失败，请稍后重试');
    }

    const res: SendCodeResponse = {
      success: true,
      expires_in: CODE_EXPIRE_SECONDS,
    };
    return NextResponse.json(res);
  } catch (err) {
    return toApiResponse(err);
  }
}

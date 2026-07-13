// ============================================================
// POST /api/v1/auth/send-code
// ------------------------------------------------------------
// 对齐 backend/api/v1/auth.py · send_code
// body: { email, captcha_id, captcha_answer(int) }
// 原子消费 captcha → 原子预留 OTP → 发信 → 按版本激活。
// 返回 { success: true, expires_in: 300 }。
// ============================================================

import { NextResponse } from 'next/server';
import { ApiError, toApiResponse, withPrivateNoStore } from '@/lib/server';
import {
  activateOtp,
  CODE_EXPIRE_SECONDS,
  consumeCaptcha,
  generateOtpCode,
  reserveOtp,
  rollbackOtp,
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendCodeRequest;
    const { email, captcha_id, captcha_answer } = body;

    // --- 基础校验 ---
    if (typeof email !== 'string') {
      throw new ApiError(400, '邮箱格式不正确');
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
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

    // --- 数据库事务内一次性校验并消费 CAPTCHA ---
    const captchaResult = await consumeCaptcha(captcha_id, captcha_answer);
    if (captchaResult === 'not_found') {
      throw new ApiError(400, '验证码已过期，请重新获取');
    }
    if (captchaResult === 'expired') {
      throw new ApiError(400, '人机验证已过期，请重新获取');
    }
    if (captchaResult === 'mismatch') {
      throw new ApiError(400, '人机验证答案错误');
    }

    // --- 生成并原子预留 OTP；数据库负责跨实例限流 ---
    const code = generateOtpCode();
    const reservation = await reserveOtp(normalizedEmail, code);
    if (reservation.status === 'rate_limited') {
      throw new ApiError(429, `请${reservation.retryAfter}秒后再试`);
    }

    // --- 发送邮件；失败时只回滚本次预留版本 ---
    let emailSent = false;
    try {
      emailSent = await sendVerificationEmail(
        normalizedEmail,
        code,
        Math.floor(CODE_EXPIRE_SECONDS / 60),
      );
    } catch {
      emailSent = false;
    }

    if (!emailSent) {
      await rollbackOtp(normalizedEmail, reservation.version);
      throw new ApiError(500, '验证码邮件发送失败，请稍后重试');
    }

    // --- 发信成功后按版本激活；不允许较早的慢请求覆盖新码 ---
    let activated: boolean;
    try {
      activated = await activateOtp(normalizedEmail, reservation.version);
    } catch {
      try {
        await rollbackOtp(normalizedEmail, reservation.version);
      } catch {
        // 激活与补偿都失败时仍只返回稳定的服务不可用错误。
      }
      throw new ApiError(503, '登录验证服务暂时不可用');
    }

    if (!activated) {
      await rollbackOtp(normalizedEmail, reservation.version);
      throw new ApiError(503, '登录验证服务暂时不可用');
    }

    const res: SendCodeResponse = {
      success: true,
      expires_in: CODE_EXPIRE_SECONDS,
    };
    return withPrivateNoStore(NextResponse.json(res));
  } catch (err) {
    return toApiResponse(err);
  }
}

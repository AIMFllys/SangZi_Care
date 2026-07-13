// ============================================================
// GET /api/v1/auth/captcha
// ------------------------------------------------------------
// 对齐 backend/api/v1/auth.py · get_captcha
// 生成简单数学人机验证题，返回 { captcha_id, question }。
// 答案摘要通过原子 RPC 存入 Supabase，不保存明文答案。
// ============================================================

import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { toApiResponse, withPrivateNoStore } from '@/lib/server';
import { putCaptcha } from '@/lib/server/otp-store';

// 强制 Node.js 运行时（nodemailer / supabase-js 依赖）
export const runtime = 'nodejs';

interface CaptchaResponse {
  captcha_id: string;
  question: string;
}

export async function GET() {
  try {
    const a = randomInt(1, 21);
    const b = randomInt(1, 21);
    const op = randomInt(0, 2) === 0 ? '+' : '-';

    let answer: number;
    let question: string;
    if (op === '+') {
      answer = a + b;
      question = `${a} + ${b} = ?`;
    } else {
      // 减法确保结果非负（对齐 Python：交换 a/b）
      const [x, y] = a < b ? [b, a] : [a, b];
      answer = x - y;
      question = `${x} - ${y} = ?`;
    }

    const captchaId = await putCaptcha(answer);
    const body: CaptchaResponse = {
      captcha_id: captchaId,
      question,
    };
    return withPrivateNoStore(NextResponse.json(body));
  } catch (error) {
    return toApiResponse(error);
  }
}

// ============================================================
// GET /api/v1/auth/captcha
// ------------------------------------------------------------
// 对齐 backend/api/v1/auth.py · get_captcha
// 生成简单数学人机验证题，返回 { captcha_id, question }。
// 答案存入进程内 otp-store（见 EdgeOne 多实例风险标注）。
// ============================================================

import { NextResponse } from 'next/server';
import { putCaptcha } from '@/lib/server/otp-store';

// 强制 Node.js 运行时（nodemailer / supabase-js 依赖）
export const runtime = 'nodejs';

interface CaptchaResponse {
  captcha_id: string;
  question: string;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function GET() {
  const a = randInt(1, 20);
  const b = randInt(1, 20);
  const op = Math.random() < 0.5 ? '+' : '-';

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

  const captchaId = putCaptcha(answer);

  const body: CaptchaResponse = {
    captcha_id: captchaId,
    question,
  };
  return NextResponse.json(body);
}

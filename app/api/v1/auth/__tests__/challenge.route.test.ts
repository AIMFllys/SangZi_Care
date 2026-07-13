// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/server';

const mocks = vi.hoisted(() => ({
  activateOtp: vi.fn(),
  consumeCaptcha: vi.fn(),
  generateOtpCode: vi.fn(),
  putCaptcha: vi.fn(),
  reserveOtp: vi.fn(),
  rollbackOtp: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

vi.mock('@/lib/server/otp-store', () => ({
  CAPTCHA_EXPIRE_SECONDS: 120,
  CODE_EXPIRE_SECONDS: 300,
  RATE_LIMIT_SECONDS: 60,
  OTP_MAX_ATTEMPTS: 5,
  activateOtp: mocks.activateOtp,
  consumeCaptcha: mocks.consumeCaptcha,
  generateOtpCode: mocks.generateOtpCode,
  putCaptcha: mocks.putCaptcha,
  reserveOtp: mocks.reserveOtp,
  rollbackOtp: mocks.rollbackOtp,
}));

vi.mock('@/lib/server/email', () => ({
  sendVerificationEmail: mocks.sendVerificationEmail,
}));

const { GET: getCaptcha } = await import('../captcha/route');
const { POST: sendCode } = await import('../send-code/route');

function sendCodeRequest(body: unknown): Request {
  return new Request('http://localhost/api/v1/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validSendCodeRequest(): Request {
  return sendCodeRequest({
    email: 'Elder@Example.com',
    captcha_id: 'captcha-1',
    captcha_answer: 7,
  });
}

describe('认证挑战路由', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.putCaptcha.mockResolvedValue('captcha-1');
    mocks.consumeCaptcha.mockResolvedValue('ok');
    mocks.generateOtpCode.mockReturnValue('012345');
    mocks.reserveOtp.mockResolvedValue({
      status: 'ok',
      version: 'reservation-1',
    });
    mocks.sendVerificationEmail.mockResolvedValue(true);
    mocks.activateOtp.mockResolvedValue(true);
    mocks.rollbackOtp.mockResolvedValue(true);
  });

  it('CAPTCHA 路由等待数据库写入后再返回随机 ID', async () => {
    const response = await getCaptcha();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      captcha_id: 'captcha-1',
      question: expect.stringMatching(/^\d+ [+-] \d+ = \?$/),
    });
    expect(mocks.putCaptcha).toHaveBeenCalledOnce();
  });

  it('CAPTCHA 数据库故障安全映射为 503', async () => {
    mocks.putCaptcha.mockRejectedValue(
      new ApiError(503, '登录验证服务暂时不可用'),
    );

    const response = await getCaptcha();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      detail: '登录验证服务暂时不可用',
    });
  });

  it('发信成功时按预留、发送、激活的顺序提交 OTP', async () => {
    const response = await sendCode(validSendCodeRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      expires_in: 300,
    });
    expect(mocks.consumeCaptcha).toHaveBeenCalledWith('captcha-1', 7);
    expect(mocks.reserveOtp).toHaveBeenCalledWith(
      'elder@example.com',
      '012345',
    );
    expect(mocks.sendVerificationEmail).toHaveBeenCalledWith(
      'elder@example.com',
      '012345',
      5,
    );
    expect(mocks.activateOtp).toHaveBeenCalledWith(
      'elder@example.com',
      'reservation-1',
    );

    const reserveOrder = mocks.reserveOtp.mock.invocationCallOrder[0];
    const sendOrder = mocks.sendVerificationEmail.mock.invocationCallOrder[0];
    const activateOrder = mocks.activateOtp.mock.invocationCallOrder[0];
    expect(reserveOrder).toBeLessThan(sendOrder);
    expect(sendOrder).toBeLessThan(activateOrder);
  });

  it('数据库全局限流时不发送邮件', async () => {
    mocks.reserveOtp.mockResolvedValue({
      status: 'rate_limited',
      retryAfter: 37,
    });

    const response = await sendCode(validSendCodeRequest());

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      detail: '请37秒后再试',
    });
    expect(mocks.sendVerificationEmail).not.toHaveBeenCalled();
    expect(mocks.activateOtp).not.toHaveBeenCalled();
  });

  it('邮件发送失败时仅按本次预留版本回滚', async () => {
    mocks.sendVerificationEmail.mockResolvedValue(false);

    const response = await sendCode(validSendCodeRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      detail: '验证码邮件发送失败，请稍后重试',
    });
    expect(mocks.rollbackOtp).toHaveBeenCalledWith(
      'elder@example.com',
      'reservation-1',
    );
    expect(mocks.activateOtp).not.toHaveBeenCalled();
  });

  it('激活失败时按版本回滚并安全返回 503', async () => {
    mocks.activateOtp.mockResolvedValue(false);

    const response = await sendCode(validSendCodeRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      detail: '登录验证服务暂时不可用',
    });
    expect(mocks.rollbackOtp).toHaveBeenCalledWith(
      'elder@example.com',
      'reservation-1',
    );
  });

  it('认证挑战生成不使用 Math.random', () => {
    const sources = [
      'app/api/v1/auth/captcha/route.ts',
      'app/api/v1/auth/send-code/route.ts',
      'lib/server/otp-store.ts',
    ];

    for (const source of sources) {
      const content = readFileSync(resolve(process.cwd(), source), 'utf8');
      expect(content, source).not.toContain('Math.random');
    }
  });
});

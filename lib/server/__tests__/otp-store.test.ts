// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/lib/server/supabase', () => ({
  getSupabaseServerClient: () => ({ rpc: mocks.rpc }),
}));

const store = await import('../otp-store');

const TEST_JWT_SECRET = 'test-jwt-secret-with-at-least-thirty-two-bytes';

describe('Supabase 认证挑战存储', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = TEST_JWT_SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('CAPTCHA 只把随机 ID 与答案摘要写入数据库', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });

    const captchaId = await store.putCaptcha(42);

    expect(captchaId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    const [name, args] = mocks.rpc.mock.calls[0];
    expect(name).toBe('oc_auth_challenge_put_captcha');
    expect(args).toMatchObject({
      p_lookup_key: captchaId,
      p_ttl_seconds: store.CAPTCHA_EXPIRE_SECONDS,
    });
    expect(args.p_secret_digest).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.values(args)).not.toContain(42);
    expect(Object.values(args)).not.toContain('42');
  });

  it('CAPTCHA 校验由数据库原子消费并映射结果', async () => {
    mocks.rpc.mockResolvedValue({ data: 'mismatch', error: null });

    await expect(store.consumeCaptcha('captcha-1', 7)).resolves.toBe('mismatch');

    expect(mocks.rpc).toHaveBeenCalledWith(
      'oc_auth_challenge_consume_captcha',
      expect.objectContaining({
        p_lookup_key: 'captcha-1',
        p_secret_digest: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
  });

  it('OTP 预留规范化邮箱且不向数据库发送邮箱或明文验证码', async () => {
    mocks.rpc.mockResolvedValue({
      data: { status: 'ok', version: 'reservation-1' },
      error: null,
    });

    await expect(
      store.reserveOtp(' Elder@Example.com ', '012345'),
    ).resolves.toEqual({ status: 'ok', version: 'reservation-1' });

    const [name, args] = mocks.rpc.mock.calls[0];
    expect(name).toBe('oc_auth_challenge_reserve_otp');
    expect(args).toMatchObject({
      p_ttl_seconds: store.CODE_EXPIRE_SECONDS,
      p_rate_limit_seconds: store.RATE_LIMIT_SECONDS,
    });
    expect(args.p_lookup_key).toMatch(/^[0-9a-f]{64}$/);
    expect(args.p_secret_digest).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(args)).not.toContain('elder@example.com');
    expect(Object.values(args)).not.toContain('012345');
  });

  it('相同邮箱的预留和消费使用同一个隐私索引', async () => {
    mocks.rpc
      .mockResolvedValueOnce({
        data: { status: 'ok', version: 'reservation-2' },
        error: null,
      })
      .mockResolvedValueOnce({ data: 'ok', error: null });

    await store.reserveOtp(' Elder@Example.com ', '123456');
    await store.consumeOtp('elder@example.com', '123456');

    expect(mocks.rpc.mock.calls[0][1].p_lookup_key)
      .toBe(mocks.rpc.mock.calls[1][1].p_lookup_key);
    expect(mocks.rpc.mock.calls[0][1].p_secret_digest)
      .toBe(mocks.rpc.mock.calls[1][1].p_secret_digest);
  });

  it('全局限流结果保留数据库计算的等待秒数', async () => {
    mocks.rpc.mockResolvedValue({
      data: { status: 'rate_limited', retry_after: 37 },
      error: null,
    });

    await expect(store.reserveOtp('elder@example.com', '123456'))
      .resolves.toEqual({ status: 'rate_limited', retryAfter: 37 });
  });

  it('激活和失败回滚都携带预留版本，避免旧请求覆盖新验证码', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: true, error: null });

    await expect(
      store.activateOtp('elder@example.com', 'version-new'),
    ).resolves.toBe(true);
    await expect(
      store.rollbackOtp('elder@example.com', 'version-old'),
    ).resolves.toBe(true);

    expect(mocks.rpc.mock.calls[0][1]).toMatchObject({
      p_version: 'version-new',
    });
    expect(mocks.rpc.mock.calls[1][1]).toMatchObject({
      p_version: 'version-old',
    });
  });

  it('OTP 消费把最大尝试次数交给数据库原子执行', async () => {
    mocks.rpc.mockResolvedValue({ data: 'locked', error: null });

    await expect(store.consumeOtp('elder@example.com', '000000'))
      .resolves.toBe('locked');
    expect(mocks.rpc).toHaveBeenCalledWith(
      'oc_auth_challenge_consume_otp',
      expect.objectContaining({ p_max_attempts: store.OTP_MAX_ATTEMPTS }),
    );
  });

  it('数据库错误安全映射为 503，响应不包含底层错误', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'function missing' },
    });

    await expect(store.putCaptcha(5)).rejects.toMatchObject({
      status: 503,
      detail: '登录验证服务暂时不可用',
    });
  });

  it('生成六位密码学随机 OTP，允许安全保留前导零', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(store.generateOtpCode()).toMatch(/^\d{6}$/);
    }
  });
});

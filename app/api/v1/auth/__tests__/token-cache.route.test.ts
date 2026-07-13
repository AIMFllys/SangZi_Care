// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  consumeOtp: vi.fn(),
  createAccessToken: vi.fn(),
  createRefreshToken: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  createAccessToken: mocks.createAccessToken,
  createRefreshToken: mocks.createRefreshToken,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
  verifyToken: mocks.verifyToken,
}));

vi.mock('@/lib/server/otp-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/otp-store')>()),
  consumeOtp: mocks.consumeOtp,
}));

const { POST: verify } = await import('../verify/route');
const { POST: refresh } = await import('../refresh/route');

const USER = {
  id: 'user-1',
  role: 'elder',
  email: 'elder@example.com',
  name: 'elder',
};

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`http://localhost/api/v1/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function expectPrivateNoStore(response: Response): void {
  expect(response.headers.get('cache-control'))
    .toBe('private, no-store, max-age=0');
  expect(response.headers.get('pragma')).toBe('no-cache');
  expect(response.headers.get('vary')).toBe('Authorization');
}

describe('token response cache policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeOtp.mockResolvedValue('ok');
    mocks.createAccessToken.mockResolvedValue('access-token');
    mocks.createRefreshToken.mockResolvedValue('refresh-token');
    mocks.verifyToken.mockResolvedValue({
      sub: USER.id,
      role: USER.role,
      type: 'refresh',
    });

    const limit = vi.fn().mockResolvedValue({ data: [USER], error: null });
    const eq = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ eq }));
    mocks.getSupabaseServerClient.mockReturnValue({
      from: vi.fn(() => ({ select })),
    });
  });

  it('verify 返回 token 时明确 private no-store', async () => {
    const response = await verify(jsonRequest('verify', {
      email: USER.email,
      code: '123456',
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      user: USER,
      is_new_user: false,
    });
    expectPrivateNoStore(response);
  });

  it('verify 等待原子消费结果，并拒绝已锁定 OTP', async () => {
    mocks.consumeOtp.mockResolvedValueOnce('locked');

    const response = await verify(jsonRequest('verify', {
      email: USER.email,
      code: '000000',
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      detail: '验证码错误次数过多，请重新获取',
    });
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('refresh 返回新 token 时明确 private no-store', async () => {
    const response = await refresh(jsonRequest('refresh', {
      refresh_token: 'old-refresh-token',
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
    expectPrivateNoStore(response);
  });
});

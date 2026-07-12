// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import {
  createAccessToken,
  createRefreshToken,
  requireUser,
  verifyToken,
} from '../auth';
import { ApiError } from '../errors';

const TEST_SECRET = 'test-secret-please-do-not-use-in-prod-32chars!';

/** 构造仅含 headers 的请求对象（requireUser 只读 headers.get）。 */
function makeRequest(headers: Record<string, string>): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

describe('server/auth', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    process.env.JWT_ALGORITHM = 'HS256';
    process.env.JWT_EXPIRE_MINUTES = '60';
    process.env.JWT_REFRESH_EXPIRE_DAYS = '7';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createAccessToken', () => {
    it('签发的 token 可解出 sub/role，且 exp-iat = JWT_EXPIRE_MINUTES', async () => {
      const token = await createAccessToken({ user_id: 'u1', role: 'elder' });
      const claims = await verifyToken(token);
      expect(claims).not.toBeNull();
      expect(claims?.sub).toBe('u1');
      expect(claims?.role).toBe('elder');
      expect(claims?.iat).toBeTypeOf('number');
      expect(claims?.exp).toBeTypeOf('number');
      expect(claims!.exp! - claims!.iat!).toBe(60 * 60);
    });

    it('access token 不含 type:refresh', async () => {
      const token = await createAccessToken({ user_id: 'u1', role: 'family' });
      const claims = await verifyToken(token);
      expect(claims?.type).toBeUndefined();
    });
  });

  describe('createRefreshToken', () => {
    it('签发的 token 含 sub/role/type:refresh，过期 7 天', async () => {
      const token = await createRefreshToken({ user_id: 'u2', role: 'family' });
      const claims = await verifyToken(token);
      expect(claims).not.toBeNull();
      expect(claims?.sub).toBe('u2');
      expect(claims?.role).toBe('family');
      expect(claims?.type).toBe('refresh');
      expect(claims!.exp! - claims!.iat!).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('verifyToken', () => {
    it('畸形 token 返回 null', async () => {
      expect(await verifyToken('not-a-jwt')).toBeNull();
    });

    it('用不同密钥签发的 token 返回 null', async () => {
      const token = await createAccessToken({ user_id: 'u1', role: 'elder' });
      process.env.JWT_SECRET = 'a-completely-different-secret-xxxxxxxxxxxx';
      expect(await verifyToken(token)).toBeNull();
      process.env.JWT_SECRET = TEST_SECRET;
    });

    it('过期 token 返回 null', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const token = await createAccessToken({ user_id: 'u1', role: 'elder' });
      // 推进 2 小时（过期 60 分钟）
      vi.setSystemTime(new Date('2024-01-01T02:00:00Z'));
      expect(await verifyToken(token)).toBeNull();
    });
  });

  describe('requireUser', () => {
    it('有效 Bearer token 返回 { user_id, role }', async () => {
      const token = await createAccessToken({ user_id: 'u1', role: 'elder' });
      const req = makeRequest({ authorization: `Bearer ${token}` });
      await expect(requireUser(req)).resolves.toEqual({
        user_id: 'u1',
        role: 'elder',
      });
    });

    it('缺失 Authorization 头抛 ApiError 401', async () => {
      try {
        await requireUser(makeRequest({}));
        throw new Error('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(401);
        expect((err as ApiError).detail).toBe('Missing authentication token');
      }
    });

    it('非 Bearer 格式抛 ApiError 401', async () => {
      await expect(
        requireUser(makeRequest({ authorization: 'NotBearer abc' })),
      ).rejects.toMatchObject({ status: 401, name: 'ApiError' });
    });

    it('无效 token 抛 ApiError 401', async () => {
      await expect(
        requireUser(makeRequest({ authorization: 'Bearer invalid-token' })),
      ).rejects.toMatchObject({ status: 401, name: 'ApiError' });
    });

    it('过期 token 抛 ApiError 401', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const token = await createAccessToken({ user_id: 'u1', role: 'elder' });
      vi.setSystemTime(new Date('2024-01-01T02:00:00Z'));
      await expect(
        requireUser(makeRequest({ authorization: `Bearer ${token}` })),
      ).rejects.toMatchObject({ status: 401, name: 'ApiError' });
    });
  });
});

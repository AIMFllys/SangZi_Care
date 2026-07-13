// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { NextResponse } from 'next/server';
import { withPrivateNoStore as compatibilityHelper } from '@/app/api/v1/_http';
import { ApiError, apiError, toApiResponse } from '..';

const PRIVATE_CACHE_CONTROL = 'private, no-store, max-age=0';

function expectPrivateNoStore(response: Response): void {
  expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE_CONTROL);
  expect(response.headers.get('pragma')).toBe('no-cache');
}

describe('private API responses', () => {
  it('精确设置私有禁缓存头，并合并且大小写去重 Vary', () => {
    const response = NextResponse.json(
      { ok: true },
      { headers: { Vary: 'Origin, authorization, ORIGIN' } },
    );

    const result = compatibilityHelper(response);

    expect(result).toBe(response);
    expectPrivateNoStore(result);
    expect(result.headers.get('vary')).toBe('Origin, Authorization');
  });

  it('从 lib/server barrel 导出同一个共享 helper', async () => {
    const server = await import('..');

    expect((server as Record<string, unknown>).withPrivateNoStore)
      .toBe(compatibilityHelper);
  });

  it('apiError 默认返回私有禁缓存响应', async () => {
    const response = apiError(400, '请求无效');

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ detail: '请求无效' });
    expectPrivateNoStore(response);
    expect(response.headers.get('vary')).toBe('Authorization');
  });

  it('toApiResponse 的已知与未知错误都默认禁止缓存', () => {
    for (const response of [
      toApiResponse(new ApiError(401, '请先登录')),
      toApiResponse(new Error('数据库连接失败')),
    ]) {
      expectPrivateNoStore(response);
      expect(response.headers.get('vary')).toBe('Authorization');
    }
  });
});

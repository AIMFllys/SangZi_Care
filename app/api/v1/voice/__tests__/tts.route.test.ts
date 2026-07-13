// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  synthesizeSpeech: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/server')>();
  return {
    ...actual,
    requireUser: mocks.requireUser,
    synthesizeSpeech: mocks.synthesizeSpeech,
  };
});

const { ApiError, MimoError } = await import('@/lib/server');
const { POST } = await import('../tts/route');

function request(body: unknown, contentType = 'application/json'): NextRequest {
  return new Request('http://localhost/api/v1/voice/tts', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe('POST /api/v1/voice/tts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'user-1', role: 'elder' });
    mocks.synthesizeSpeech.mockResolvedValue({
      bytes: new Uint8Array([0xff, 0xf3, 0x84, 0xc4]),
      contentType: 'audio/mpeg',
    });
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('未登录返回 401 且不调用 MiMo', async () => {
    mocks.requireUser.mockRejectedValue(new ApiError(401, 'Missing authentication token'));

    const response = await POST(request({ text: '您好' }));

    expect(response.status).toBe(401);
    expect(mocks.synthesizeSpeech).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('非 JSON 请求体返回 400', async () => {
    const response = await POST(request('not-json'));
    expect(response.status).toBe(400);
  });

  it.each([
    [{}, 'text 不能为空'],
    [{ text: '' }, 'text 不能为空'],
    [{ text: '   ' }, 'text 不能为空'],
    [{ text: 123 }, 'text 不能为空'],
  ])('拒绝空或非字符串文本 %#', async (body, detail) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ detail });
  });

  it('按 Unicode 字符计数拒绝 1001 字符', async () => {
    const response = await POST(request({ text: '药'.repeat(1001) }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      detail: 'text 长度不能超过 1000 个字符',
    });
  });

  it.each([0.49, 2.01, null, '1'])('拒绝非法兼容 speed：%s', async (speed) => {
    const response = await POST(request({ text: '您好', speed }));
    expect(response.status).toBe(400);
    expect(mocks.synthesizeSpeech).not.toHaveBeenCalled();
  });

  it('兼容合法 speed 但不把它作为 MiMo 结构化参数', async () => {
    const response = await POST(request({ text: ' 您好 ', speed: 0.8 }));

    expect(response.status).toBe(200);
    expect(mocks.synthesizeSpeech).toHaveBeenCalledWith('您好');
  });

  it('成功返回 MP3、私有不缓存和请求 ID', async () => {
    const response = await POST(request({ text: '现在该吃药了' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('audio/mpeg');
    expect(response.headers.get('content-disposition')).toContain('tts_output.mp3');
    expect(response.headers.get('cache-control')).toContain('private');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/i);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([0xff, 0xf3, 0x84, 0xc4]),
    );
  });

  it.each([
    ['config', 503],
    ['auth', 502],
    ['payment_required', 503],
    ['forbidden', 502],
    ['content_filter', 422],
    ['rate_limit', 429],
    ['upstream', 502],
    ['timeout', 504],
    ['schema', 502],
    ['no_speech', 422],
  ] as const)('将 MiMo %s 映射为 HTTP %i', async (kind, status) => {
    mocks.synthesizeSpeech.mockRejectedValue(new MimoError('安全错误', kind, status));

    const response = await POST(request({ text: '您好' }));

    expect(response.status).toBe(status);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(response.headers.get('cache-control')).toContain('no-store');
    await expect(response.json()).resolves.toEqual({ detail: '安全错误' });
  });

  it('可观测日志只含长度与请求元数据', async () => {
    await POST(request({ text: '隐私文本' }));

    const serialized = JSON.stringify(vi.mocked(console.info).mock.calls);
    expect(serialized).toContain('textLength');
    expect(serialized).not.toContain('隐私文本');
    expect(serialized).not.toContain('api-key');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('authenticated API transports', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetchFormData 注入 bearer 且让浏览器生成 multipart boundary', async () => {
    localStorage.setItem('token', 'access-one');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ text: '识别成功' }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchFormData } = await import('../api');
    const formData = new FormData();
    formData.append('file', new Blob(['wav'], { type: 'audio/wav' }), 'recording.wav');

    await expect(fetchFormData<{ text: string }>(
      '/api/v1/voice/transcribe',
      formData,
    )).resolves.toEqual({ text: '识别成功' });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(init.method).toBe('POST');
    expect(init.body).toBe(formData);
    expect(headers.get('authorization')).toBe('Bearer access-one');
    expect(headers.has('content-type')).toBe(false);
  });

  it('fetchBlob 序列化 JSON 并保留二进制响应', async () => {
    localStorage.setItem('token', 'access-one');
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      new Uint8Array([0xff, 0xfb, 0x90, 0]),
      { status: 200, headers: { 'Content-Type': 'audio/mpeg' } },
    ));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchBlob } = await import('../api');

    const blob = await fetchBlob('/api/v1/voice/tts', {
      method: 'POST',
      body: { text: '现在该吃药了' },
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(init.body).toBe(JSON.stringify({ text: '现在该吃药了' }));
    expect(headers.get('content-type')).toBe('application/json');
    expect(blob.type).toBe('audio/mpeg');
    expect(Array.from(new Uint8Array(await blob.arrayBuffer())))
      .toEqual([0xff, 0xfb, 0x90, 0]);
  });

  it('合并同账号同路径的并发 GET，完成后不保留陈旧缓存', async () => {
    localStorage.setItem('token', 'access-one');
    let release!: (response: Response) => void;
    const pendingResponse = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const fetchMock = vi.fn().mockReturnValueOnce(pendingResponse)
      .mockResolvedValueOnce(jsonResponse({ value: 2 }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchApi } = await import('../api');

    const first = fetchApi<{ value: number }>('/api/dashboard');
    const second = fetchApi<{ value: number }>('/api/dashboard');
    expect(fetchMock).toHaveBeenCalledOnce();

    release(jsonResponse({ value: 1 }));
    await expect(Promise.all([first, second])).resolves.toEqual([
      { value: 1 },
      { value: 1 },
    ]);

    await expect(fetchApi<{ value: number }>('/api/dashboard'))
      .resolves.toEqual({ value: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('401 后单次刷新 token 并用新 token 重试', async () => {
    localStorage.setItem('token', 'expired-access');
    localStorage.setItem('refresh_token', 'refresh-one');
    let protectedCalls = 0;
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/refresh')) {
        return Promise.resolve(jsonResponse({
          access_token: 'fresh-access',
          refresh_token: 'refresh-two',
        }));
      }
      protectedCalls += 1;
      return Promise.resolve(protectedCalls === 1
        ? jsonResponse({ detail: 'expired' }, 401)
        : jsonResponse({ ok: true }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const { fetchFormData } = await import('../api');

    await expect(fetchFormData('/api/v1/voice/transcribe', new FormData()))
      .resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retry = fetchMock.mock.calls[2][1] as RequestInit;
    expect(new Headers(retry.headers).get('authorization'))
      .toBe('Bearer fresh-access');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-two');
  });

  it('refresh 服务 503 时抛出临时错误而不是原始 401', async () => {
    localStorage.setItem('token', 'expired-access');
    localStorage.setItem('refresh_token', 'refresh-one');
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/refresh')) {
        return Promise.resolve(jsonResponse({ detail: '刷新服务暂不可用' }, 503));
      }
      return Promise.resolve(jsonResponse({ detail: 'expired' }, 401));
    });
    vi.stubGlobal('fetch', fetchMock);
    const { fetchApi } = await import('../api');

    await expect(fetchApi('/api/protected')).rejects.toMatchObject({
      name: 'ApiError',
      status: 503,
      message: '刷新服务暂不可用',
    });
    expect(localStorage.getItem('token')).toBe('expired-access');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-one');
  });

  it('refresh 网络失败时抛出可恢复网络错误而不是原始 401', async () => {
    localStorage.setItem('token', 'expired-access');
    localStorage.setItem('refresh_token', 'refresh-one');
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/refresh')) {
        return Promise.reject(new TypeError('network unavailable'));
      }
      return Promise.resolve(jsonResponse({ detail: 'expired' }, 401));
    });
    vi.stubGlobal('fetch', fetchMock);
    const { fetchApi } = await import('../api');

    await expect(fetchApi('/api/protected')).rejects.toMatchObject({
      name: 'ApiError',
      status: null,
      message: '网络连接失败，请稍后重试',
    });
    expect(localStorage.getItem('token')).toBe('expired-access');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-one');
  });

  it('refresh 明确返回 401 时保留认证失效语义', async () => {
    localStorage.setItem('token', 'expired-access');
    localStorage.setItem('refresh_token', 'invalid-refresh');
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/refresh')) {
        return Promise.resolve(jsonResponse({ detail: '无效的refresh token' }, 401));
      }
      return Promise.resolve(jsonResponse({ detail: 'expired' }, 401));
    });
    vi.stubGlobal('fetch', fetchMock);
    const { fetchApi } = await import('../api');

    await expect(fetchApi('/api/protected')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('并发 401 共享一次 refresh，两个请求各自重试', async () => {
    localStorage.setItem('token', 'expired-access');
    localStorage.setItem('refresh_token', 'refresh-one');
    let protectedCalls = 0;
    let releaseRefresh!: (response: Response) => void;
    const refreshResponse = new Promise<Response>((resolve) => {
      releaseRefresh = resolve;
    });
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/refresh')) return refreshResponse;
      protectedCalls += 1;
      return Promise.resolve(protectedCalls <= 2
        ? jsonResponse({ detail: 'expired' }, 401)
        : jsonResponse({ ok: protectedCalls }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const { fetchFormData } = await import('../api');

    const first = fetchFormData('/api/one', new FormData());
    const second = fetchFormData('/api/two', new FormData());
    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/api/v1/auth/refresh'))).toHaveLength(1);
    });
    releaseRefresh(jsonResponse({
      access_token: 'fresh-access',
      refresh_token: 'refresh-two',
    }));

    await expect(Promise.all([first, second])).resolves.toEqual([
      { ok: 3 },
      { ok: 4 },
    ]);
    expect(protectedCalls).toBe(4);
  });

  it('调用方在等待共享 refresh 时中止，不取消其他请求的 refresh', async () => {
    localStorage.setItem('token', 'expired-access');
    localStorage.setItem('refresh_token', 'refresh-one');
    let protectedCalls = 0;
    let releaseRefresh!: (response: Response) => void;
    const refreshResponse = new Promise<Response>((resolve) => {
      releaseRefresh = resolve;
    });
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/refresh')) return refreshResponse;
      protectedCalls += 1;
      return Promise.resolve(protectedCalls <= 2
        ? jsonResponse({ detail: 'expired' }, 401)
        : jsonResponse({ ok: true }));
    });
    vi.stubGlobal('fetch', fetchMock);
    const { fetchFormData } = await import('../api');
    const controller = new AbortController();

    const first = fetchFormData('/api/one', new FormData());
    const second = fetchFormData('/api/two', new FormData(), {
      signal: controller.signal,
    });
    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.filter(([url]) =>
        String(url).endsWith('/api/v1/auth/refresh'))).toHaveLength(1);
    });
    controller.abort();
    await expect(second).rejects.toMatchObject({ name: 'AbortError' });

    releaseRefresh(jsonResponse({
      access_token: 'fresh-access',
      refresh_token: 'refresh-two',
    }));
    await expect(first).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls.filter(([url]) =>
      String(url).endsWith('/api/v1/auth/refresh'))).toHaveLength(1);
  });

  it('保留初次 fetch 的 AbortError', async () => {
    const fetchMock = vi.fn().mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        }, { once: true });
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { fetchBlob } = await import('../api');
    const controller = new AbortController();

    const request = fetchBlob('/api/v1/voice/tts', {
      method: 'POST',
      body: { text: '测试' },
      signal: controller.signal,
    });
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('非 JSON 错误抛出带状态码的 ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad gateway', {
      status: 502,
      headers: { 'Content-Type': 'text/plain' },
    })));
    const { ApiError, fetchBlob } = await import('../api');

    await expect(fetchBlob('/api/v1/voice/tts')).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        status: 502,
        message: expect.stringContaining('502'),
      }),
    );
    await expect(fetchBlob('/api/v1/voice/tts')).rejects.toBeInstanceOf(ApiError);
  });

  it('保留 fetchApi 的 skipAuth、JSON 与 204 契约', async () => {
    localStorage.setItem('token', 'must-not-send');
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchApi } = await import('../api');

    await expect(fetchApi('/api/public', {
      method: 'POST',
      body: { value: 1 },
      skipAuth: true,
    })).resolves.toBeUndefined();

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.has('authorization')).toBe(false);
    expect(headers.get('content-type')).toBe('application/json');
    expect(init.body).toBe(JSON.stringify({ value: 1 }));
  });

  it('fetchApi 支持联系人偏好的 PUT JSON 请求', async () => {
    localStorage.setItem('token', 'access-one');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      alias: '妈妈',
      is_pinned: true,
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchApi } = await import('../api');

    await expect(fetchApi('/api/v1/messages/contacts/peer-1', {
      method: 'PUT',
      body: { alias: '妈妈', is_pinned: true },
    })).resolves.toEqual({ alias: '妈妈', is_pinned: true });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('PUT');
    expect(init.body).toBe(JSON.stringify({ alias: '妈妈', is_pinned: true }));
    expect(new Headers(init.headers).get('authorization')).toBe('Bearer access-one');
  });
});

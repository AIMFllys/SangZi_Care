// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  chat: vi.fn(),
  recognizeIntent: vi.fn(),
  generateSummary: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

vi.mock('@/lib/server/doubao', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/doubao')>()),
  chat: mocks.chat,
  recognizeIntent: mocks.recognizeIntent,
  generateSummary: mocks.generateSummary,
}));

const { POST: postChat } = await import('../chat/route');
const { POST: postIntent } = await import('../intent/route');
const { GET: getSummary } = await import('../summary/[user_id]/route');

function jsonRequest(path: string, body: unknown): NextRequest {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function createChatDatabase(error: unknown = null) {
  const insert = vi.fn().mockResolvedValue({ error });
  return { client: { from: vi.fn(() => ({ insert })) }, insert };
}

function createSummaryDatabase(
  data: unknown[] | null = [],
  error: unknown = null,
) {
  const limit = vi.fn().mockResolvedValue({ data, error });
  const order = vi.fn(() => ({ limit }));
  const eq = vi.fn(() => ({ order }));
  const select = vi.fn(() => ({ eq }));
  return { client: { from: vi.fn(() => ({ select })) }, limit };
}

function expectPrivateNoStore(response: Response): void {
  expect(response.headers.get('cache-control')).toBe(
    'private, no-store, max-age=0',
  );
  expect(response.headers.get('pragma')).toBe('no-cache');
  expect(response.headers.get('vary')).toContain('Authorization');
}

describe('AI API 生产边界', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'user-1', role: 'elder' });
    mocks.getSupabaseServerClient.mockReturnValue(createChatDatabase().client);
    mocks.chat.mockResolvedValue('请记得按时吃药。');
    mocks.recognizeIntent.mockResolvedValue({
      intent: 'medication_confirm',
      entities: {},
      confidence: 0.9,
    });
    mocks.generateSummary.mockResolvedValue('老人近期情绪稳定。');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/ai/chat', () => {
    it('Content-Length 明示超过 64 KiB 时在读取请求体前返回 413', async () => {
      const request = jsonRequest('/api/v1/ai/chat', {
        messages: [{ role: 'user', content: '您好' }],
      });
      request.headers.set('Content-Length', String(64 * 1024 + 1));

      const response = await postChat(request);

      expect(response.status).toBe(413);
      expect(request.bodyUsed).toBe(false);
      expect(mocks.chat).not.toHaveBeenCalled();
    });

    it('Content-Length 不可信时仍按实际 JSON 字节数返回 413', async () => {
      const request = jsonRequest('/api/v1/ai/chat', {
        messages: [{ role: 'user', content: '您好' }],
        padding: 'x'.repeat(64 * 1024),
      });
      request.headers.set('Content-Length', '1');

      const response = await postChat(request);

      expect(response.status).toBe(413);
      expect(mocks.chat).not.toHaveBeenCalled();
    });

    it('解析后拒绝超过 50 条消息', async () => {
      const response = await postChat(jsonRequest('/api/v1/ai/chat', {
        messages: Array.from({ length: 51 }, () => ({
          role: 'user',
          content: '您好',
        })),
      }));

      expect(response.status).toBe(400);
      expect(mocks.chat).not.toHaveBeenCalled();
    });

    it('解析后拒绝单条超过 4000 个 Unicode 字符的消息', async () => {
      const response = await postChat(jsonRequest('/api/v1/ai/chat', {
        messages: [{ role: 'user', content: '药'.repeat(4_001) }],
      }));

      expect(response.status).toBe(400);
      expect(mocks.chat).not.toHaveBeenCalled();
    });

    it('解析后把非对象消息项作为 400 而不是 500', async () => {
      const response = await postChat(jsonRequest('/api/v1/ai/chat', {
        messages: [null],
      }));

      expect(response.status).toBe(400);
      expect(mocks.chat).not.toHaveBeenCalled();
    });

    it('成功响应与校验错误都私有不缓存', async () => {
      const success = await postChat(jsonRequest('/api/v1/ai/chat', {
        messages: [{ role: 'user', content: '您好' }],
      }));
      const failure = await postChat(jsonRequest('/api/v1/ai/chat', {
        messages: [],
      }));

      expect(success.status).toBe(200);
      expect(failure.status).toBe(400);
      expectPrivateNoStore(success);
      expectPrivateNoStore(failure);
    });
  });

  describe('POST /api/v1/ai/intent', () => {
    it('Content-Length 明示超过 8 KiB 时在读取请求体前返回 413', async () => {
      const request = jsonRequest('/api/v1/ai/intent', { text: '我吃过药了' });
      request.headers.set('Content-Length', String(8 * 1024 + 1));

      const response = await postIntent(request);

      expect(response.status).toBe(413);
      expect(request.bodyUsed).toBe(false);
      expect(mocks.recognizeIntent).not.toHaveBeenCalled();
    });

    it('Content-Length 不可信时仍按实际 JSON 字节数返回 413', async () => {
      const request = jsonRequest('/api/v1/ai/intent', {
        text: '我吃过药了',
        padding: 'x'.repeat(8 * 1024),
      });
      request.headers.set('Content-Length', '1');

      const response = await postIntent(request);

      expect(response.status).toBe(413);
      expect(mocks.recognizeIntent).not.toHaveBeenCalled();
    });

    it('解析后拒绝空白或超过 2000 个 Unicode 字符的文本', async () => {
      const blank = await postIntent(jsonRequest('/api/v1/ai/intent', {
        text: '   ',
      }));
      const oversized = await postIntent(jsonRequest('/api/v1/ai/intent', {
        text: '药'.repeat(2_001),
      }));

      expect(blank.status).toBe(400);
      expect(oversized.status).toBe(400);
      expect(mocks.recognizeIntent).not.toHaveBeenCalled();
    });

    it('成功响应与校验错误都私有不缓存', async () => {
      const success = await postIntent(jsonRequest('/api/v1/ai/intent', {
        text: '我吃过药了',
      }));
      const failure = await postIntent(jsonRequest('/api/v1/ai/intent', {
        text: 123,
      }));

      expect(success.status).toBe(200);
      expect(failure.status).toBe(400);
      expectPrivateNoStore(success);
      expectPrivateNoStore(failure);
    });
  });

  describe('GET /api/v1/ai/summary/:user_id', () => {
    it('无记录与有记录响应都私有不缓存', async () => {
      mocks.getSupabaseServerClient.mockReturnValueOnce(
        createSummaryDatabase().client,
      );
      const empty = await getSummary(
        new Request('http://localhost/api/v1/ai/summary/user-1') as NextRequest,
        { params: Promise.resolve({ user_id: 'user-1' }) },
      );

      mocks.getSupabaseServerClient.mockReturnValueOnce(
        createSummaryDatabase([{
          user_input: '今天心情不错',
          ai_response: '真为您高兴',
        }]).client,
      );
      const generated = await getSummary(
        new Request('http://localhost/api/v1/ai/summary/user-1') as NextRequest,
        { params: Promise.resolve({ user_id: 'user-1' }) },
      );

      expect(empty.status).toBe(200);
      expect(generated.status).toBe(200);
      expectPrivateNoStore(empty);
      expectPrivateNoStore(generated);
    });

    it('鉴权和数据库错误响应都私有不缓存', async () => {
      mocks.requireUser.mockRejectedValueOnce(
        new (await import('@/lib/server')).ApiError(401, 'Missing authentication token'),
      );
      const unauthorized = await getSummary(
        new Request('http://localhost/api/v1/ai/summary/user-1') as NextRequest,
        { params: Promise.resolve({ user_id: 'user-1' }) },
      );

      mocks.getSupabaseServerClient.mockReturnValueOnce(
        createSummaryDatabase(null, new Error('database unavailable')).client,
      );
      const failed = await getSummary(
        new Request('http://localhost/api/v1/ai/summary/user-1') as NextRequest,
        { params: Promise.resolve({ user_id: 'user-1' }) },
      );

      expect(unauthorized.status).toBe(401);
      expect(failed.status).toBe(500);
      expectPrivateNoStore(unauthorized);
      expectPrivateNoStore(failed);
    });
  });
});

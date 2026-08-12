// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  completeMimoChat: vi.fn(),
  executeCompanionToolCall: vi.fn(),
  recognizeIntent: vi.fn(),
  generateSummary: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
  completeMimoChat: mocks.completeMimoChat,
}));

vi.mock('@/lib/server/doubao', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/doubao')>()),
  recognizeIntent: mocks.recognizeIntent,
  generateSummary: mocks.generateSummary,
}));

vi.mock('@/lib/server/companion-tools', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/companion-tools')>()),
  executeCompanionToolCall: mocks.executeCompanionToolCall,
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
    mocks.completeMimoChat.mockResolvedValue({
      content: '请记得按时吃药。',
      toolCalls: [],
    });
    mocks.executeCompanionToolCall.mockResolvedValue({
      toolCallId: 'call-1',
      content: '{"ok":true,"message":"已记录"}',
      actions: [{
        type: 'health_recorded', label: '已记录心率', status: 'success', success: true,
      }],
    });
    mocks.recognizeIntent.mockResolvedValue({
      intent: 'medication_confirm',
      entities: {},
      confidence: 0.9,
    });
    mocks.generateSummary.mockResolvedValue('老人近期情绪稳定。');
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
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
      expect(mocks.completeMimoChat).not.toHaveBeenCalled();
    });

    it('Content-Length 不可信时仍按实际 JSON 字节数返回 413', async () => {
      const request = jsonRequest('/api/v1/ai/chat', {
        messages: [{ role: 'user', content: '您好' }],
        padding: 'x'.repeat(64 * 1024),
      });
      request.headers.set('Content-Length', '1');

      const response = await postChat(request);

      expect(response.status).toBe(413);
      expect(mocks.completeMimoChat).not.toHaveBeenCalled();
    });

    it('解析后拒绝超过 50 条消息', async () => {
      const response = await postChat(jsonRequest('/api/v1/ai/chat', {
        messages: Array.from({ length: 51 }, () => ({
          role: 'user',
          content: '您好',
        })),
      }));

      expect(response.status).toBe(400);
      expect(mocks.completeMimoChat).not.toHaveBeenCalled();
    });

    it('解析后拒绝单条超过 4000 个 Unicode 字符的消息', async () => {
      const response = await postChat(jsonRequest('/api/v1/ai/chat', {
        messages: [{ role: 'user', content: '药'.repeat(4_001) }],
      }));

      expect(response.status).toBe(400);
      expect(mocks.completeMimoChat).not.toHaveBeenCalled();
    });

    it('解析后把非对象消息项作为 400 而不是 500', async () => {
      const response = await postChat(jsonRequest('/api/v1/ai/chat', {
        messages: [null],
      }));

      expect(response.status).toBe(400);
      expect(mocks.completeMimoChat).not.toHaveBeenCalled();
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

    it('执行 MiMo 工具后把真实结果回传模型并返回动作状态', async () => {
      mocks.completeMimoChat
        .mockResolvedValueOnce({
          content: '',
          toolCalls: [{
            id: 'call-1',
            type: 'function',
            function: {
              name: 'record_health_metric',
              arguments: '{"record_type":"heart_rate","value":72}',
            },
          }],
        })
        .mockResolvedValueOnce({ content: '已经替您记录心率 72 次/分。', toolCalls: [] });

      const response = await postChat(jsonRequest('/api/v1/ai/chat', {
        messages: [{ role: 'user', content: '我心率七十二' }],
      }));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        reply: '已经替您记录心率 72 次/分。',
        actions: [{ type: 'health_recorded', success: true }],
      });
      expect(mocks.executeCompanionToolCall).toHaveBeenCalledOnce();
      expect(mocks.completeMimoChat).toHaveBeenCalledTimes(2);
      expect(mocks.completeMimoChat.mock.calls[1][0]).toContainEqual(
        expect.objectContaining({ role: 'tool', tool_call_id: 'call-1' }),
      );
    });

    it('工具已执行但 MiMo 收尾失败时用真实工具消息兜底并返回 200，避免客户端重试副作用', async () => {
      mocks.completeMimoChat
        .mockResolvedValueOnce({
          content: '',
          toolCalls: [{
            id: 'call-save-1',
            type: 'function',
            function: { name: 'save_murmur', arguments: '{"summary":"散步","share_with_family":false}' },
          }],
        })
        .mockRejectedValueOnce(new Error('upstream unavailable'));
      mocks.executeCompanionToolCall.mockResolvedValueOnce({
        toolCallId: 'call-save-1',
        content: '{"ok":true,"message":"碎碎念已私密保存。"}',
        actions: [{
          type: 'murmur_saved', label: '碎碎念已私密保存', status: 'success', success: true,
        }],
      });

      const response = await postChat(jsonRequest('/api/v1/ai/chat', {
        messages: [{ role: 'user', content: '记录今天散步' }],
        session_id: 'session-safe-fallback',
      }));

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        reply: '碎碎念已私密保存。',
        session_id: 'session-safe-fallback',
        actions: [{ type: 'murmur_saved', status: 'success' }],
      });
      expect(console.error).toHaveBeenCalledWith(
        '[POST /ai/chat] companion_finalize_failed',
        expect.objectContaining({
          sessionId: 'session-safe-fallback',
          userId: 'user-1',
          role: 'elder',
          toolCallIds: ['call-save-1'],
        }),
      );
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

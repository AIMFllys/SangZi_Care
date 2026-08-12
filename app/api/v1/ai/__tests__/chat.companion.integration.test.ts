// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  completeMimoChat: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
  completeMimoChat: mocks.completeMimoChat,
}));

const { POST } = await import('../chat/route');

function jsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/v1/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function createDatabase() {
  const murmurSelect = vi.fn().mockResolvedValue({
    data: [{ id: 'murmur-1' }],
    error: null,
  });
  const murmurInsert = vi.fn(() => ({ select: murmurSelect }));
  const auditInsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn((table: string) => {
    if (table === 'oc_ai_murmurs') return { insert: murmurInsert };
    if (table === 'oc_ai_conversations') return { insert: auditInsert };
    throw new Error(`unexpected table: ${table}`);
  });
  const rpc = vi.fn().mockResolvedValue({
    data: ['message-family-1', 'message-family-2'],
    error: null,
  });
  return {
    client: { from, rpc },
    from,
    murmurInsert,
    auditInsert,
    rpc,
  };
}

describe('POST /api/v1/ai/chat companion integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'elder-1', role: 'elder' });
  });

  it('真实执行碎碎念工具的 insert 与原子分享 RPC，并把动作返回客户端', async () => {
    const database = createDatabase();
    mocks.getSupabaseServerClient.mockReturnValue(database.client);
    mocks.completeMimoChat
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [{
          id: 'call-share-1',
          type: 'function',
          function: {
            name: 'save_murmur',
            arguments: JSON.stringify({
              summary: '今天在公园遇见老朋友，心情很好。',
              share_with_family: true,
            }),
          },
        }],
      })
      .mockResolvedValueOnce({
        content: '已经保存，并同步给两位家属。',
        toolCalls: [],
      });

    const response = await POST(jsonRequest({
      messages: [{ role: 'user', content: '把今天在公园遇见老朋友的事告诉孩子吧' }],
      session_id: 'session-integration-1',
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reply: '已经保存，并同步给两位家属。',
      session_id: 'session-integration-1',
      actions: [
        { type: 'murmur_saved', status: 'success', success: true },
        { type: 'murmur_shared', status: 'success', success: true },
      ],
    });
    expect(database.from).toHaveBeenCalledWith('oc_ai_murmurs');
    expect(database.murmurInsert).toHaveBeenCalledWith(expect.objectContaining({
      elder_id: 'elder-1',
      source_text: '把今天在公园遇见老朋友的事告诉孩子吧',
      summary: '今天在公园遇见老朋友，心情很好。',
      share_status: 'private',
    }));
    expect(database.rpc).toHaveBeenCalledWith('oc_share_ai_murmur', {
      p_murmur_id: 'murmur-1',
      p_elder_id: 'elder-1',
      p_summary: '今天在公园遇见老朋友，心情很好。',
    });
    expect(database.auditInsert).toHaveBeenCalledWith(expect.objectContaining({
      action_taken: 'murmur_saved,murmur_shared',
    }));
  });
});

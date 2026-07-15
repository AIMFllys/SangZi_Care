// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

const { GET } = await import('../overview/route');

const overview = [{
  peer_id: 'user-2',
  unread_count: 3,
  last_message: {
    id: 'message-1',
    sender_id: 'user-2',
    receiver_id: 'user-1',
    type: 'text',
    category: 'murmur',
    content: '今天在公园遇见老朋友。',
    audio_url: 'private/path.wav',
    audio_duration: null,
    is_ai_generated: true,
    is_read: false,
    read_at: null,
    created_at: '2026-07-14T08:00:00Z',
  },
}];

describe('GET /api/v1/messages/overview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'user-1', role: 'elder' });
    mocks.rpc.mockResolvedValue({ data: overview, error: null });
    mocks.getSupabaseServerClient.mockReturnValue({ rpc: mocks.rpc });
  });

  it('一次 RPC 返回联系人概览并强制隐藏音频对象路径', async () => {
    const response = await GET(
      new Request('http://localhost/api/v1/messages/overview') as NextRequest,
    );

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('oc_get_message_overview', {
      p_user_id: 'user-1',
    });
    await expect(response.json()).resolves.toEqual([expect.objectContaining({
      peer_id: 'user-2',
      unread_count: 3,
      last_message: expect.objectContaining({
        category: 'murmur',
        audio_url: null,
      }),
    })]);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('拒绝结构异常的 RPC 数据', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ peer_id: 'user-2' }], error: null });

    const response = await GET(
      new Request('http://localhost/api/v1/messages/overview') as NextRequest,
    );

    expect(response.status).toBe(500);
  });
});

// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getSupabaseServerClient: vi.fn(),
  resolveMessagePeer: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

vi.mock('../_lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../_lib')>()),
  resolveMessagePeer: mocks.resolveMessagePeer,
}));

const { PATCH } = await import('../read-all/route');

function createDatabase(result = { data: [{ id: 'm-1' }, { id: 'm-2' }], error: null }) {
  const select = vi.fn().mockResolvedValue(result);
  const unreadEq = vi.fn(() => ({ select }));
  const receiverEq = vi.fn(() => ({ eq: unreadEq }));
  const senderEq = vi.fn(() => ({ eq: receiverEq }));
  const update = vi.fn(() => ({ eq: senderEq }));
  return { client: { from: vi.fn(() => ({ update })) }, update, senderEq, receiverEq, unreadEq };
}

function request(body: unknown): NextRequest {
  return new Request('http://localhost/api/v1/messages/read-all', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe('PATCH /api/v1/messages/read-all', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'user-1', role: 'elder' });
    mocks.resolveMessagePeer.mockResolvedValue(undefined);
    mocks.getSupabaseServerClient.mockReturnValue(createDatabase().client);
  });

  it('一次标记指定联系人的全部未读消息并返回数量', async () => {
    const database = createDatabase();
    mocks.getSupabaseServerClient.mockReturnValue(database.client);

    const response = await PATCH(request({ peer_id: 'user-2' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ count: 2 });
    expect(mocks.resolveMessagePeer).toHaveBeenCalledWith(
      database.client,
      'user-1',
      'user-2',
    );
    expect(database.senderEq).toHaveBeenCalledWith('sender_id', 'user-2');
    expect(database.receiverEq).toHaveBeenCalledWith('receiver_id', 'user-1');
    expect(database.unreadEq).toHaveBeenCalledWith('is_read', false);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('拒绝空联系人 id', async () => {
    const response = await PATCH(request({ peer_id: ' ' }));

    expect(response.status).toBe(400);
    expect(mocks.resolveMessagePeer).not.toHaveBeenCalled();
  });
});

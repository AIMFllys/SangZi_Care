// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { ApiError } from '@/lib/server';

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

const { PUT } = await import('../contacts/[peer_id]/route');
const context = { params: Promise.resolve({ peer_id: 'peer-1' }) };

function request(body: unknown): NextRequest {
  return new Request('http://localhost/api/v1/messages/contacts/peer-1', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function database(result: { data: unknown; error: unknown }) {
  const select = vi.fn().mockResolvedValue(result);
  const upsert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ upsert }));
  return { client: { from }, from, upsert, select };
}

describe('PUT /messages/contacts/:peer preference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'owner-1', role: 'family' });
    mocks.resolveMessagePeer.mockResolvedValue(undefined);
  });

  it('校验 active peer 后按认证 owner 幂等写入完整偏好', async () => {
    const db = database({ data: [{ owner_id: 'owner-1', peer_id: 'peer-1', alias: '妈妈', is_pinned: true }], error: null });
    mocks.getSupabaseServerClient.mockReturnValue(db.client);
    const response = await PUT(request({ alias: '  妈妈  ', is_pinned: true }), context);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('private');
    expect(mocks.resolveMessagePeer).toHaveBeenCalledWith(db.client, 'owner-1', 'peer-1');
    expect(db.upsert).toHaveBeenCalledWith({
      owner_id: 'owner-1', peer_id: 'peer-1', alias: '妈妈', is_pinned: true,
      updated_at: expect.any(String),
    }, { onConflict: 'owner_id,peer_id' });
  });

  it('null 或空白备注规范为 null', async () => {
    const db = database({ data: [{ owner_id: 'owner-1', peer_id: 'peer-1', alias: null, is_pinned: false }], error: null });
    mocks.getSupabaseServerClient.mockReturnValue(db.client);
    const response = await PUT(request({ alias: '   ', is_pinned: false }), context);
    expect(response.status).toBe(200);
    expect(db.upsert).toHaveBeenCalledWith(expect.objectContaining({ alias: null }), expect.anything());
  });

  it.each([
    [{ alias: null }, 400],
    [{ is_pinned: true }, 400],
    [{ alias: null, is_pinned: true, owner_id: 'victim' }, 400],
    [{ alias: 'x'.repeat(41), is_pinned: true }, 400],
    [{ alias: null, is_pinned: 'yes' }, 400],
  ])('拒绝非全量或非法请求 %#', async (body, status) => {
    const response = await PUT(request(body), context);
    expect(response.status).toBe(status);
  });

  it('active bind 校验失败时不写偏好', async () => {
    mocks.resolveMessagePeer.mockRejectedValue(new ApiError(403, '未绑定该联系人'));
    const db = database({ data: [], error: null });
    mocks.getSupabaseServerClient.mockReturnValue(db.client);
    const response = await PUT(request({ alias: null, is_pinned: false }), context);
    expect(response.status).toBe(403);
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it('拒绝把本人保存为联系人且不创建数据库客户端', async () => {
    const response = await PUT(
      request({ alias: null, is_pinned: false }),
      { params: Promise.resolve({ peer_id: 'owner-1' }) },
    );
    expect(response.status).toBe(400);
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
    expect(mocks.resolveMessagePeer).not.toHaveBeenCalled();
  });

  it('超限 body 私有 413，数据库错误不泄漏', async () => {
    const huge = await PUT(request({ alias: 'x'.repeat(3000), is_pinned: false }), context);
    expect(huge.status).toBe(413);
    expect(huge.headers.get('cache-control')).toContain('private');

    const db = database({ data: null, error: { message: 'secret database detail' } });
    mocks.getSupabaseServerClient.mockReturnValue(db.client);
    const failed = await PUT(request({ alias: null, is_pinned: false }), context);
    expect(failed.status).toBe(500);
    expect(await failed.text()).not.toContain('secret database detail');
  });
});

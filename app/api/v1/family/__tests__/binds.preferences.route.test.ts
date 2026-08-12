// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), getSupabaseServerClient: vi.fn() }));
vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));
const { GET } = await import('../binds/route');

class Query {
  constructor(private result: { data: unknown; error: unknown }, readonly calls: unknown[][] = []) {}
  select(...args: unknown[]) { this.calls.push(['select', ...args]); return this; }
  or(...args: unknown[]) { this.calls.push(['or', ...args]); return this; }
  eq(...args: unknown[]) { this.calls.push(['eq', ...args]); return this; }
  in(...args: unknown[]) { this.calls.push(['in', ...args]); return this; }
  then(resolve: (value: { data: unknown; error: unknown }) => unknown) { return Promise.resolve(this.result).then(resolve); }
}

const bind = {
  id: 'bind-1', elder_id: 'elder-1', family_id: 'family-1', relation: '母亲', status: 'active',
  bind_code: null, can_view_health: true, can_edit_health: true, can_edit_medication: true,
  can_receive_emergency: true, bound_at: null, created_at: null, expires_at: null,
};

describe('GET family binds 私有联系人偏好投影', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'family-1', role: 'family' });
  });

  it('只查询当前 owner 和 active peer ids 并固定投影', async () => {
    const queries = {
      oc_elder_family_binds: new Query({ data: [bind], error: null }),
      oc_users: new Query({ data: [{ id: 'elder-1', name: '王奶奶', phone: null, avatar_url: null, last_active_at: null, role: 'elder' }], error: null }),
      oc_contact_preferences: new Query({ data: [{ owner_id: 'family-1', peer_id: 'elder-1', alias: '妈妈', is_pinned: true }], error: null }),
    };
    mocks.getSupabaseServerClient.mockReturnValue({ from: (table: keyof typeof queries) => queries[table] });
    const response = await GET(new Request('http://localhost/api/v1/family/binds') as NextRequest);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([expect.objectContaining({
      contact_preference: { alias: '妈妈', is_pinned: true },
    })]);
    expect(queries.oc_contact_preferences.calls).toContainEqual(['eq', 'owner_id', 'family-1']);
    expect(queries.oc_contact_preferences.calls).toContainEqual(['in', 'peer_id', ['elder-1']]);
  });

  it.each([
    [{ owner_id: 'other-owner', peer_id: 'elder-1', alias: '越权', is_pinned: false }],
    [{ owner_id: 'family-1', peer_id: 'inactive-peer', alias: null, is_pinned: false }],
    [{ owner_id: 'family-1', peer_id: 'elder-1', alias: ' 未规范 ', is_pinned: false }],
    [{ owner_id: 'family-1', peer_id: 'elder-1', alias: null, is_pinned: 'yes' }],
  ])('拒绝投影异常或不属于当前 active peer 的偏好 %#', async (preference) => {
    const queries = {
      oc_elder_family_binds: new Query({ data: [bind], error: null }),
      oc_users: new Query({ data: [], error: null }),
      oc_contact_preferences: new Query({ data: preference, error: null }),
    };
    mocks.getSupabaseServerClient.mockReturnValue({ from: (table: keyof typeof queries) => queries[table] });
    const response = await GET(new Request('http://localhost/api/v1/family/binds') as NextRequest);
    expect(response.status).toBe(500);
  });

  it('无偏好固定回退 null/false，偏好查询失败不静默', async () => {
    const make = (preference: { data: unknown; error: unknown }) => ({
      oc_elder_family_binds: new Query({ data: [bind], error: null }),
      oc_users: new Query({ data: [], error: null }),
      oc_contact_preferences: new Query(preference),
    });
    let queries = make({ data: [], error: null });
    mocks.getSupabaseServerClient.mockReturnValue({ from: (table: keyof typeof queries) => queries[table] });
    const empty = await GET(new Request('http://localhost/api/v1/family/binds') as NextRequest);
    await expect(empty.json()).resolves.toEqual([expect.objectContaining({
      contact_preference: { alias: null, is_pinned: false },
    })]);

    queries = make({ data: null, error: { message: 'private failure' } });
    mocks.getSupabaseServerClient.mockReturnValue({ from: (table: keyof typeof queries) => queries[table] });
    const failed = await GET(new Request('http://localhost/api/v1/family/binds') as NextRequest);
    expect(failed.status).toBe(500);
  });
});

// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), getSupabaseServerClient: vi.fn() }));
vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

const notify = await import('../notify/route');
const cancel = await import('../cancel/route');

function request(path: string, body: unknown): NextRequest {
  return new Request(`http://localhost${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const call = {
  id: 'call-1', user_id: 'elder-1', request_id: null, trigger_method: 'button', status: 'cancelled',
  called_numbers: [], called_contacts: {}, notified_families: [], location: null,
  triggered_at: '2026-08-13T01:00:00Z', answered_at: null, ended_at: '2026-08-13T01:02:00Z',
  cancel_reason: null, cancelled_by: 'elder-1', recording_url: null, recording_duration: null,
  notification_sent_at: null, created_at: '2026-08-13T01:00:00Z',
};

describe('emergency legacy/cancel routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'elder-1', role: 'elder' });
  });

  it('legacy notify 鉴权后返回私有 410 且绝不访问数据库', async () => {
    const response = await notify.POST(request('/api/v1/emergency/notify', {
      emergency_call_id: 'call-1', family_ids: ['family-1'],
    }));
    expect(response.status).toBe(410);
    expect(response.headers.get('cache-control')).toContain('private');
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('cancel 不信任可能过期的 JWT role，仍严格按 owner 过滤', async () => {
    mocks.requireUser.mockResolvedValue({ user_id: 'elder-1', role: 'family' });
    const select = vi.fn().mockResolvedValue({ data: [call], error: null });
    const eqStatus = vi.fn(() => ({ select }));
    const eqOwner = vi.fn(() => ({ eq: eqStatus }));
    const eqId = vi.fn(() => ({ eq: eqOwner }));
    mocks.getSupabaseServerClient.mockReturnValue({
      from: vi.fn(() => ({ update: vi.fn(() => ({ eq: eqId })) })),
    });
    const response = await cancel.POST(request('/api/v1/emergency/cancel', { emergency_call_id: 'call-1' }));
    expect(response.status).toBe(200);
    expect(eqOwner).toHaveBeenCalledWith('user_id', 'elder-1');
  });

  it('cancel 仅按 owner + triggered 更新', async () => {
    const select = vi.fn().mockResolvedValue({ data: [call], error: null });
    const eqStatus = vi.fn(() => ({ select }));
    const eqOwner = vi.fn(() => ({ eq: eqStatus }));
    const eqId = vi.fn(() => ({ eq: eqOwner }));
    const update = vi.fn(() => ({ eq: eqId }));
    mocks.getSupabaseServerClient.mockReturnValue({ from: vi.fn(() => ({ update })) });

    const response = await cancel.POST(request('/api/v1/emergency/cancel', { emergency_call_id: 'call-1' }));
    expect(response.status).toBe(200);
    expect(eqId).toHaveBeenCalledWith('id', 'call-1');
    expect(eqOwner).toHaveBeenCalledWith('user_id', 'elder-1');
    expect(eqStatus).toHaveBeenCalledWith('status', 'triggered');
  });

  it('cancel 的越权或非 triggered 记录统一不可见', async () => {
    const select = vi.fn().mockResolvedValue({ data: [], error: null });
    const eqStatus = vi.fn(() => ({ select }));
    const eqOwner = vi.fn(() => ({ eq: eqStatus }));
    const eqId = vi.fn(() => ({ eq: eqOwner }));
    const update = vi.fn(() => ({ eq: eqId }));
    mocks.getSupabaseServerClient.mockReturnValue({ from: vi.fn(() => ({ update })) });
    const response = await cancel.POST(request('/api/v1/emergency/cancel', { emergency_call_id: 'other-call' }));
    expect(response.status).toBe(404);
  });

  it('cancel 对超限 JSON 返回私有 413', async () => {
    const response = await cancel.POST(request('/api/v1/emergency/cancel', {
      emergency_call_id: 'call-1', reason: 'x'.repeat(5000),
    }));
    expect(response.status).toBe(413);
    expect(response.headers.get('cache-control')).toContain('private');
  });
});

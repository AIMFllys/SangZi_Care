// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), getSupabaseServerClient: vi.fn() }));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

const { POST } = await import('../trigger/route');

function request(body: unknown): NextRequest {
  return new Request('http://localhost/api/v1/emergency/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function invalidJsonRequest(): NextRequest {
  return new Request('http://localhost/api/v1/emergency/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  }) as unknown as NextRequest;
}

const call = {
  id: 'call-1', user_id: 'elder-1', request_id: '11111111-1111-4111-8111-111111111111',
  trigger_method: 'button', status: 'triggered', called_numbers: [], called_contacts: {},
  notified_families: ['family-1'], location: null, triggered_at: '2026-08-13T01:00:00Z',
  answered_at: null, ended_at: null, cancel_reason: null, cancelled_by: null,
  recording_url: null, recording_duration: null, notification_sent_at: '2026-08-13T01:00:00Z',
  created_at: '2026-08-13T01:00:00Z',
};

describe('POST /api/v1/emergency/trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'elder-1', role: 'elder' });
  });

  it('JWT 角色可能过期时仍调用 RPC，由数据库权威角色判定', async () => {
    mocks.requireUser.mockResolvedValue({ user_id: 'family-1', role: 'family' });
    const rpc = vi.fn().mockResolvedValue({
      data: {
        call: { ...call, user_id: 'family-1' },
        notification_status: 'sent', recipient_count: 1, replayed: false,
      },
      error: null,
    });
    mocks.getSupabaseServerClient.mockReturnValue({ rpc });
    const response = await POST(request({
      request_id: '11111111-1111-4111-8111-111111111111', trigger_method: 'button',
    }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('oc_trigger_emergency', expect.objectContaining({
      p_elder_id: 'family-1',
    }));
    expect(response.headers.get('cache-control')).toContain('private');
  });

  it('非法 JSON 也返回私有 400', async () => {
    const response = await POST(invalidJsonRequest());
    expect(response.status).toBe(400);
    expect(response.headers.get('cache-control')).toContain('private');
  });

  it.each([
    [{ trigger_method: 'button' }, 'request_id'],
    [{ request_id: 'not-uuid', trigger_method: 'button' }, 'request_id'],
    [{ request_id: '11111111-1111-4111-8111-111111111111', trigger_method: 'other' }, 'trigger_method'],
    [{ request_id: '11111111-1111-4111-8111-111111111111', trigger_method: 'button', location: { latitude: 91, longitude: 114 } }, 'location'],
    [{ request_id: '11111111-1111-4111-8111-111111111111', trigger_method: 'button', location: { latitude: 30, longitude: 114, label: 'secret' } }, 'location'],
  ])('拒绝非法请求 %#', async (body, detail) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(await response.text()).toContain(detail);
  });

  it('一次 RPC 返回已通知结果并严格映射响应', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { call: { ...call, location: { longitude: 114.3, accuracy: 12, latitude: 30.5 } }, notification_status: 'sent', recipient_count: 1, replayed: false }, error: null });
    mocks.getSupabaseServerClient.mockReturnValue({ rpc });
    const response = await POST(request({
      request_id: call.request_id,
      trigger_method: 'button',
      location: { latitude: 30.5, longitude: 114.3, accuracy: 12 },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('private');
    await expect(response.json()).resolves.toMatchObject({
      id: 'call-1', notification_status: 'sent', recipient_count: 1, replayed: false,
    });
    expect(rpc).toHaveBeenCalledWith('oc_trigger_emergency', {
      p_elder_id: 'elder-1', p_request_id: call.request_id, p_trigger_method: 'button',
      p_location: { latitude: 30.5, longitude: 114.3, accuracy: 12 },
    });
  });

  it('零收件人仍 200 且不谎报已发送', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { call: { ...call, trigger_method: 'voice', notified_families: [], notification_sent_at: null }, notification_status: 'no_recipients', recipient_count: 0, replayed: false }, error: null });
    mocks.getSupabaseServerClient.mockReturnValue({ rpc });
    const response = await POST(request({ request_id: call.request_id, trigger_method: 'voice' }));
    await expect(response.json()).resolves.toMatchObject({ notification_status: 'no_recipients', recipient_count: 0 });
  });

  it('拒绝结构畸形或自相矛盾的 RPC 成功值', async () => {
    mocks.getSupabaseServerClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: { call, notification_status: 'sent', recipient_count: 0, replayed: false },
        error: null,
      }),
    });
    const response = await POST(request({ request_id: call.request_id, trigger_method: 'button' }));
    expect(response.status).toBe(500);
  });

  it('拒绝与请求身份或收件人数组不一致的 RPC 成功值', async () => {
    mocks.getSupabaseServerClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: {
          call: { ...call, request_id: '22222222-2222-4222-8222-222222222222' },
          notification_status: 'sent', recipient_count: 2, replayed: false,
        },
        error: null,
      }),
    });
    const response = await POST(request({ request_id: call.request_id, trigger_method: 'button' }));
    expect(response.status).toBe(500);
  });

  it('对超限 JSON 返回私有 413', async () => {
    const response = await POST(new Request('http://localhost/api/v1/emergency/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: call.request_id, trigger_method: 'button', padding: 'x'.repeat(5000) }),
    }) as unknown as NextRequest);
    expect(response.status).toBe(413);
    expect(response.headers.get('cache-control')).toContain('private');
  });

  it('RPC 错误返回私有 500 且不泄漏详情', async () => {
    mocks.getSupabaseServerClient.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: { code: 'XX', message: 'database secret detail' } }) });
    const response = await POST(request({ request_id: call.request_id, trigger_method: 'button' }));
    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toContain('private');
    expect(await response.text()).not.toContain('database secret detail');
  });

  it.each([
    ['P0001', 'emergency_request_conflict', 409],
    ['P0001', 'invalid_emergency_actor', 403],
  ])('只映射稳定 RPC 业务错误 %s/%s', async (code, message, status) => {
    mocks.getSupabaseServerClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code, message } }),
    });
    const response = await POST(request({ request_id: call.request_id, trigger_method: 'button' }));
    expect(response.status).toBe(status);
  });

  it('同错误文案但非稳定 SQLSTATE 不映射 409', async () => {
    mocks.getSupabaseServerClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { code: 'XX000', message: 'emergency_request_conflict' } }),
    });
    const response = await POST(request({ request_id: call.request_id, trigger_method: 'button' }));
    expect(response.status).toBe(500);
  });
});

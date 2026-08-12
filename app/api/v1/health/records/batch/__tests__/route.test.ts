// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

const { POST } = await import('../route');

function request(body: unknown, extraHeaders: Record<string, string> = {}): NextRequest {
  return new Request('http://localhost/api/v1/health/records/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const validRecord = {
  record_type: 'blood_pressure',
  values: { systolic: 120, diastolic: 80 },
  measured_at: '2026-08-13T01:00:00.000Z',
  input_method: 'manual',
  notes: '晨起',
};

describe('POST /api/v1/health/records/batch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'elder-1', role: 'elder' });
  });

  it('validates every draft before making one atomic RPC call', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ id: 'record-1', ...validRecord, user_id: 'elder-1' }],
      error: null,
    });
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [{ id: 'bind-1' }], error: null })),
          })),
        })),
      })),
    }));
    mocks.getSupabaseServerClient.mockReturnValue({ rpc, from });

    const response = await POST(request({
      user_id: 'elder-1',
      records: [validRecord, {
        record_type: 'heart_rate',
        values: { value: 72 },
        measured_at: '2026-08-13T01:01:00.000Z',
        input_method: 'manual',
      }],
    }));

    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('oc_create_health_records_batch', expect.objectContaining({
      p_target_user_id: 'elder-1',
      p_recorded_by: 'elder-1',
      p_records: expect.any(Array),
    }));
  });

  it('rejects more than five records before touching the database', async () => {
    const rpc = vi.fn();
    const from = vi.fn();
    mocks.getSupabaseServerClient.mockReturnValue({ rpc, from });

    const response = await POST(request({
      records: Array.from({ length: 6 }, () => validRecord),
    }));

    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects one invalid draft without partially writing valid drafts', async () => {
    const rpc = vi.fn();
    const from = vi.fn();
    mocks.getSupabaseServerClient.mockReturnValue({ rpc, from });

    const response = await POST(request({
      records: [validRecord, {
        record_type: 'heart_rate',
        values: { value: 0 },
        measured_at: '2026-08-13T01:01:00.000Z',
        input_method: 'manual',
      }],
    }));

    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects unknown fields instead of silently persisting them', async () => {
    const rpc = vi.fn();
    const from = vi.fn();
    mocks.getSupabaseServerClient.mockReturnValue({ rpc, from });

    const response = await POST(request({ records: [{ ...validRecord, debug: true }] }));

    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects an invalid Content-Length before authenticating or touching the database', async () => {
    const response = await POST(request({ records: [validRecord] }, { 'Content-Length': 'not-a-number' }));

    expect(response.status).toBe(400);
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });

  it('enforces the byte limit for multibyte JSON bodies before authenticating', async () => {
    const oversizedNotes = '中'.repeat(33_000);
    const response = await POST(request({ records: [{ ...validRecord, notes: oversizedNotes }] }));

    expect(response.status).toBe(413);
    expect(mocks.requireUser).not.toHaveBeenCalled();
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });
});

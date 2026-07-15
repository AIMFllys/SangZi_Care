// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getSupabaseServerClient: vi.fn(),
}));

vi.mock('@/lib/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server')>()),
  requireUser: mocks.requireUser,
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

const { GET } = await import('../route');

interface QueryResult {
  data: unknown;
  error: unknown;
}

class QueryBuilder {
  constructor(
    private readonly result: QueryResult,
    private readonly calls: Array<{ method: string; args: unknown[] }>,
  ) {}

  private chain(method: string, args: unknown[]): this {
    this.calls.push({ method, args });
    return this;
  }

  select(...args: unknown[]) { return this.chain('select', args); }
  eq(...args: unknown[]) { return this.chain('eq', args); }
  in(...args: unknown[]) { return this.chain('in', args); }
  order(...args: unknown[]) { return this.chain('order', args); }
  limit(...args: unknown[]) { return this.chain('limit', args); }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

function healthRow(
  id: string,
  recordType: string,
  measuredAt: string,
  values: Record<string, number>,
) {
  return {
    id,
    user_id: 'elder-1',
    record_type: recordType,
    values,
    measured_at: measuredAt,
    input_method: 'manual',
    recorded_by: 'elder-1',
    is_abnormal: false,
    abnormal_reason: null,
    notes: null,
    symptoms: null,
    created_at: measuredAt,
  };
}

function createDatabase(result: QueryResult) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const from = vi.fn(() => new QueryBuilder(result, calls));
  return { client: { from }, from, calls };
}

describe('GET /api/v1/health/records/latest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'elder-1', role: 'elder' });
  });

  it('一次查询后按类型归并最新记录', async () => {
    const db = createDatabase({
      data: [
        healthRow('heart-new', 'heart_rate', '2026-07-15T08:00:00Z', { value: 72 }),
        healthRow('pressure', 'blood_pressure', '2026-07-15T07:00:00Z', {
          systolic: 128,
          diastolic: 78,
        }),
        healthRow('heart-old', 'heart_rate', '2026-07-14T08:00:00Z', { value: 68 }),
      ],
      error: null,
    });
    mocks.getSupabaseServerClient.mockReturnValue(db.client);

    const response = await GET(
      new NextRequest('http://localhost/api/v1/health/records/latest'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(db.from).toHaveBeenCalledTimes(1);
    expect(db.from).toHaveBeenCalledWith('oc_health_records');
    expect(db.calls).toContainEqual({
      method: 'in',
      args: [
        'record_type',
        ['blood_pressure', 'blood_sugar', 'heart_rate', 'weight', 'temperature'],
      ],
    });
    expect(body.heart_rate.id).toBe('heart-new');
    expect(body.blood_pressure.id).toBe('pressure');
    expect(body.blood_sugar).toBeNull();
    expect(body.weight).toBeNull();
    expect(body.temperature).toBeNull();
    expect(response.headers.get('cache-control')).toContain('no-store');
  });
});

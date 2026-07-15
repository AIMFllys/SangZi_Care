// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
    private readonly table: string,
    private readonly queue: QueryResult[],
    private readonly calls: Array<{ table: string; method: string; args: unknown[] }>,
  ) {}

  private chain(method: string, args: unknown[]): this {
    this.calls.push({ table: this.table, method, args });
    return this;
  }

  select(...args: unknown[]) { return this.chain('select', args); }
  eq(...args: unknown[]) { return this.chain('eq', args); }
  limit(...args: unknown[]) { return this.chain('limit', args); }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    const result = this.queue.shift();
    if (!result) {
      return Promise.reject(new Error(`未配置 ${this.table} 查询结果`))
        .then(onfulfilled, onrejected);
    }
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

function createDatabase(bindResults: QueryResult[], snapshot: unknown = {}) {
  const queue = [...bindResults];
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const from = vi.fn((table: string) => new QueryBuilder(table, queue, calls));
  const rpc = vi.fn().mockResolvedValue({ data: snapshot, error: null });
  return { client: { from, rpc }, calls, from, rpc };
}

function activeBind(overrides: Record<string, boolean> = {}): QueryResult {
  return {
    data: [{
      can_view_health: true,
      can_edit_health: true,
      can_edit_medication: true,
      ...overrides,
    }],
    error: null,
  };
}

function request(userId = 'elder-1'): NextRequest {
  return new NextRequest(
    `http://localhost/api/v1/family/dashboard?user_id=${userId}`,
  );
}

describe('GET /api/v1/family/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T04:00:00.000Z'));
    mocks.requireUser.mockResolvedValue({ user_id: 'family-1', role: 'family' });
  });

  it('一次聚合持久化发生项、最新健康与严格七日窗口', async () => {
    const db = createDatabase([activeBind()], {
      medication_adherence: [
        { date: '2026-07-13', planned: 2, completed: 2 },
        { date: '2026-07-14', planned: 2, completed: 1 },
      ],
      latest_vitals: [
        {
          id: 'heart-today',
          record_type: 'heart_rate',
          values: { value: 72 },
          measured_at: '2026-07-14T02:00:00.000Z',
          is_abnormal: false,
          abnormal_reason: null,
        },
        {
          id: 'pressure-today',
          record_type: 'blood_pressure',
          values: { systolic: 148, diastolic: 92 },
          measured_at: '2026-07-14T01:00:00.000Z',
          is_abnormal: true,
          abnormal_reason: '血压偏高',
        },
      ],
      heart_rate_daily: [
        { date: '2026-07-12', value: 68 },
        { date: '2026-07-14', value: 72 },
      ],
      abnormal_count: 1,
    });
    mocks.getSupabaseServerClient.mockReturnValue(db.client);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.access).toEqual({ health: true, medication: true });
    expect(body.todayMedication).toEqual({ completed: 1, total: 2, rate: 50 });
    expect(body.adherence7d).toBe(75);
    expect(body.medicationAdherence).toHaveLength(7);
    expect(body.latestVitals.blood_pressure.values).toEqual({
      systolic: 148,
      diastolic: 92,
    });
    expect(body.heartRateTrend).toEqual(expect.arrayContaining([
      { date: '2026-07-12', value: 68 },
      { date: '2026-07-14', value: 72 },
    ]));
    expect(body.abnormalCount7d).toBe(1);
    expect(db.rpc).toHaveBeenCalledWith(
      'oc_get_care_dashboard_snapshot',
      expect.objectContaining({
        p_user_id: 'elder-1',
        p_include_health: true,
        p_include_medication: true,
      }),
    );
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('健康代录授权不会越权开放用药统计', async () => {
    const db = createDatabase([
      activeBind({
        can_view_health: false,
        can_edit_health: true,
        can_edit_medication: false,
      }),
    ], {
      latest_vitals: [],
      abnormal_count: 0,
    });
    mocks.getSupabaseServerClient.mockReturnValue(db.client);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.access).toEqual({ health: true, medication: false });
    expect(body.todayMedication.total).toBe(0);
    expect(db.rpc).toHaveBeenCalledWith(
      'oc_get_care_dashboard_snapshot',
      expect.objectContaining({
        p_include_health: true,
        p_include_medication: false,
      }),
    );
  });

  it('仅用药管理授权可看用药摘要但不会返回健康数据', async () => {
    const db = createDatabase([
      activeBind({
        can_view_health: false,
        can_edit_health: false,
        can_edit_medication: true,
      }),
    ], {
      medication_adherence: [
        { date: '2026-07-14', planned: 1, completed: 1 },
      ],
    });
    mocks.getSupabaseServerClient.mockReturnValue(db.client);

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.access).toEqual({ health: false, medication: true });
    expect(body.todayMedication).toEqual({ completed: 1, total: 1, rate: 100 });
    expect(body.latestVitals).toEqual({});
    expect(db.rpc).toHaveBeenCalledWith(
      'oc_get_care_dashboard_snapshot',
      expect.objectContaining({
        p_include_health: false,
        p_include_medication: true,
      }),
    );
  });

  it('陌生家属或全部权限关闭时拒绝访问且不调用聚合函数', async () => {
    const strangerDb = createDatabase([{ data: [], error: null }]);
    mocks.getSupabaseServerClient.mockReturnValueOnce(strangerDb.client);
    const strangerResponse = await GET(request('stranger-elder'));

    const deniedDb = createDatabase([
      activeBind({
        can_view_health: false,
        can_edit_health: false,
        can_edit_medication: false,
      }),
    ]);
    mocks.getSupabaseServerClient.mockReturnValueOnce(deniedDb.client);
    const deniedResponse = await GET(request());

    expect(strangerResponse.status).toBe(403);
    expect(deniedResponse.status).toBe(403);
    expect(strangerDb.rpc).not.toHaveBeenCalled();
    expect(deniedDb.rpc).not.toHaveBeenCalled();
  });

  it('数据库快照排除未来健康数据且不再使用 250 条截断', () => {
    const sql = readFileSync(
      resolve(
        process.cwd(),
        'supabase/migrations/20260714193000_medication_occurrence_snapshots_and_dashboard_rpc.sql',
      ),
      'utf8',
    );

    expect(sql).toMatch(/record\.measured_at\s*<\s*p_end/g);
    expect(sql).toMatch(/record\.scheduled_time\s*<\s*p_end/);
    expect(sql).toMatch(/distinct on \(record\.record_type\)/);
    expect(sql).not.toMatch(/limit\s+250/i);
  });
});

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

const { POST } = await import('../records/route');

interface QueryResult {
  data: unknown;
  error: unknown;
}

interface DatabaseCall {
  table: string;
  method: string;
  args: unknown[];
}

class QueryBuilder {
  constructor(
    private readonly table: string,
    private readonly queue: QueryResult[],
    private readonly calls: DatabaseCall[],
  ) {}

  private chain(method: string, args: unknown[]): this {
    this.calls.push({ table: this.table, method, args });
    return this;
  }

  select(...args: unknown[]): this {
    return this.chain('select', args);
  }

  eq(...args: unknown[]): this {
    return this.chain('eq', args);
  }

  limit(...args: unknown[]): this {
    return this.chain('limit', args);
  }

  upsert(...args: unknown[]): this {
    return this.chain('upsert', args);
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ): Promise<TResult1 | TResult2> {
    const result = this.queue.shift();
    if (!result) {
      return Promise.reject(
        new Error(`测试未配置 ${this.table} 的下一次查询结果`),
      ).then(onfulfilled, onrejected);
    }
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

function createDatabase(tableResults: Record<string, QueryResult[]>) {
  const queues = new Map(
    Object.entries(tableResults).map(([table, results]) => [
      table,
      [...results],
    ]),
  );
  const calls: DatabaseCall[] = [];
  const from = vi.fn((table: string) => {
    const queue = queues.get(table) ?? [];
    queues.set(table, queue);
    return new QueryBuilder(table, queue, calls);
  });

  return { client: { from }, calls, from };
}

function jsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/v1/medicine/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const PLAN = {
  id: 'plan-1',
  user_id: 'elder-1',
  medicine_name: '降压药',
  dosage: '1片',
  schedule_times: ['08:30:00'],
  repeat_days: null,
  start_date: '2026-01-01',
  end_date: null,
  is_active: true,
  created_by: 'elder-1',
  unit: '片',
  notes: null,
  side_effects: null,
  remind_enabled: true,
  remind_before_minutes: 10,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const NORMALIZED_SCHEDULED_AT = '2026-07-14T00:30:00.000Z';

describe('POST /api/v1/medicine/records', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'elder-1', role: 'elder' });
  });

  it('丢弃输入的秒和毫秒，并以规范分钟作为幂等 upsert 键', async () => {
    const record = {
      id: 'record-1',
      user_id: 'elder-1',
      plan_id: 'plan-1',
      scheduled_time: NORMALIZED_SCHEDULED_AT,
      status: 'taken',
      taken_at: '2026-07-14T00:31:00.000Z',
      delayed_count: null,
      notes: null,
      created_at: '2026-07-14T00:31:00.000Z',
      confirmed_by: 'elder-1',
    };
    const db = createDatabase({
      oc_medication_plans: [{ data: [PLAN], error: null }],
      oc_medication_records: [{ data: [record], error: null }],
    });
    mocks.getSupabaseServerClient.mockReturnValue(db.client);

    const response = await POST(
      jsonRequest({
        plan_id: 'plan-1',
        scheduled_time: '2026-07-14T00:30:45.987Z',
        status: 'taken',
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: 'record-1',
      scheduled_time: NORMALIZED_SCHEDULED_AT,
      confirmed_by: 'elder-1',
    });

    const upsertCall = db.calls.find(
      ({ table, method }) =>
        table === 'oc_medication_records' && method === 'upsert',
    );
    expect(upsertCall?.args[0]).toMatchObject({
      user_id: 'elder-1',
      plan_id: 'plan-1',
      scheduled_time: NORMALIZED_SCHEDULED_AT,
      status: 'taken',
      confirmed_by: 'elder-1',
    });
    expect(upsertCall?.args[1]).toEqual({
      onConflict: 'plan_id,scheduled_time',
    });
  });

  it('家属有代管权限时仍拒绝不属于该长辈的计划', async () => {
    const db = createDatabase({
      oc_elder_family_binds: [
        { data: [{ id: 'bind-1' }], error: null },
      ],
      oc_medication_plans: [{ data: [], error: null }],
    });
    mocks.requireUser.mockResolvedValue({
      user_id: 'family-1',
      role: 'family',
    });
    mocks.getSupabaseServerClient.mockReturnValue(db.client);

    const response = await POST(
      jsonRequest({
        user_id: 'elder-1',
        plan_id: 'someone-elses-plan',
        scheduled_time: '2026-07-14T00:30:00.000Z',
        status: 'taken',
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      detail: '用药计划不存在或不属于该长辈',
    });
    expect(db.calls).toEqual(
      expect.arrayContaining([
        {
          table: 'oc_elder_family_binds',
          method: 'eq',
          args: ['can_edit_medication', true],
        },
        {
          table: 'oc_elder_family_binds',
          method: 'eq',
          args: ['status', 'active'],
        },
        {
          table: 'oc_medication_plans',
          method: 'eq',
          args: ['user_id', 'elder-1'],
        },
      ]),
    );
    expect(db.from).not.toHaveBeenCalledWith('oc_medication_records');
  });
});

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

const { PATCH } = await import('../plans/[plan_id]/route');

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

  update(...args: unknown[]): this {
    return this.chain('update', args);
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
  return new Request(
    'http://localhost/api/v1/medicine/plans/plan-1',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  ) as unknown as NextRequest;
}

const PLAN = {
  id: 'plan-1',
  user_id: 'elder-1',
  medicine_name: '降压药',
  dosage: '1片',
  schedule_times: ['08:30'],
  repeat_days: [1, 3, 5],
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  is_active: true,
  created_by: 'elder-1',
  unit: '片',
  notes: '饭后服用',
  side_effects: '轻微头晕',
  remind_enabled: true,
  remind_before_minutes: 10,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function patchPlan(body: unknown) {
  return PATCH(jsonRequest(body), {
    params: Promise.resolve({ plan_id: 'plan-1' }),
  });
}

describe('PATCH /api/v1/medicine/plans/:plan_id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      user_id: 'elder-1',
      role: 'elder',
    });
  });

  it('将 null 和空数组作为明确清空语义写入数据库', async () => {
    const updatedPlan = {
      ...PLAN,
      repeat_days: [],
      end_date: null,
      notes: null,
      side_effects: null,
      is_active: false,
      remind_enabled: false,
      remind_before_minutes: 1440,
    };
    const db = createDatabase({
      oc_medication_plans: [
        { data: [PLAN], error: null },
        { data: [updatedPlan], error: null },
      ],
    });
    mocks.getSupabaseServerClient.mockReturnValue(db.client);

    const response = await patchPlan({
      repeat_days: [],
      end_date: null,
      notes: null,
      side_effects: null,
      is_active: false,
      remind_enabled: false,
      remind_before_minutes: 1440,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      repeat_days: [],
      end_date: null,
      notes: null,
      side_effects: null,
      is_active: false,
      remind_enabled: false,
      remind_before_minutes: 1440,
    });
    const updateCall = db.calls.find(
      ({ table, method }) =>
        table === 'oc_medication_plans' && method === 'update',
    );
    expect(updateCall?.args[0]).toMatchObject({
      repeat_days: [],
      end_date: null,
      notes: null,
      side_effects: null,
      is_active: false,
      remind_enabled: false,
      remind_before_minutes: 1440,
      updated_at: expect.any(String),
    });
  });

  it.each([-1, 1.5, 1441])(
    '拒绝越界或非整数的提前提醒分钟数：%s',
    async (remindBeforeMinutes) => {
      const response = await patchPlan({
        remind_before_minutes: remindBeforeMinutes,
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        detail: 'remind_before_minutes 必须为 0 到 1440 的整数',
      });
      expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
    },
  );

  it('结合现有开始日期拒绝更早的结束日期', async () => {
    const db = createDatabase({
      oc_medication_plans: [{ data: [PLAN], error: null }],
    });
    mocks.getSupabaseServerClient.mockReturnValue(db.client);

    const response = await patchPlan({ end_date: '2025-12-31' });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      detail: '结束日期不能早于开始日期',
    });
    expect(
      db.calls.some(({ method }) => method === 'update'),
    ).toBe(false);
  });

  it('拒绝不存在的自然日期', async () => {
    const response = await patchPlan({ start_date: '2026-02-30' });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      detail: 'start_date 必须为有效日期',
    });
    expect(mocks.getSupabaseServerClient).not.toHaveBeenCalled();
  });
});

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

const { POST: generateCode } = await import('../generate-code/route');
const { POST: bindFamily } = await import('../bind/route');
const { PATCH: updateBind, DELETE: deleteBind } = await import(
  '../binds/[bind_id]/route'
);

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

  gt(...args: unknown[]): this {
    return this.chain('gt', args);
  }

  is(...args: unknown[]): this {
    return this.chain('is', args);
  }

  limit(...args: unknown[]): this {
    return this.chain('limit', args);
  }

  update(...args: unknown[]): this {
    return this.chain('update', args);
  }

  delete(...args: unknown[]): this {
    return this.chain('delete', args);
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

function createDatabase(
  tableResults: Record<string, QueryResult[]> = {},
  rpcResults: QueryResult[] = [],
) {
  const queues = new Map(
    Object.entries(tableResults).map(([table, results]) => [
      table,
      [...results],
    ]),
  );
  const calls: DatabaseCall[] = [];
  const rpcQueue = [...rpcResults];
  const from = vi.fn((table: string) => {
    const queue = queues.get(table) ?? [];
    queues.set(table, queue);
    return new QueryBuilder(table, queue, calls);
  });
  const rpc = vi.fn(async () => {
    const result = rpcQueue.shift();
    if (!result) throw new Error('测试未配置下一次 RPC 结果');
    return result;
  });

  return { client: { from, rpc }, calls, from, rpc };
}

function jsonRequest(path: string, body: unknown): NextRequest {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const ACTIVE_BIND = {
  id: 'bind-1',
  elder_id: 'elder-1',
  family_id: 'family-1',
  relation: '父亲',
  status: 'active',
  bind_code: null,
  can_view_health: true,
  can_edit_health: true,
  can_edit_medication: true,
  can_receive_emergency: true,
  bound_at: '2026-07-14T00:00:00.000Z',
  created_at: '2026-07-14T00:00:00.000Z',
  expires_at: null,
};

const PENDING_BIND = {
  ...ACTIVE_BIND,
  id: 'bind-pending',
  family_id: null,
  status: 'pending',
  bind_code: '123456',
  bound_at: null,
  expires_at: '2099-07-14T00:10:00.000Z',
};

describe('家庭绑定路由权限边界', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ user_id: 'elder-1', role: 'elder' });
  });

  describe('POST /api/v1/family/generate-code', () => {
    it('只依据数据库中的角色允许长辈生成绑定码', async () => {
      const db = createDatabase(
        {
          oc_users: [{ data: [{ role: 'elder' }], error: null }],
        },
        [{ data: 'bind-new', error: null }],
      );
      mocks.requireUser.mockResolvedValue({
        user_id: 'elder-1',
        role: 'family',
      });
      mocks.getSupabaseServerClient.mockReturnValue(db.client);

      const response = await generateCode(
        new Request('http://localhost/api/v1/family/generate-code', {
          method: 'POST',
        }) as NextRequest,
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        bind_id: 'bind-new',
        bind_code: expect.stringMatching(/^\d{6}$/),
        expires_at: expect.any(String),
      });
      expect(db.rpc).toHaveBeenCalledWith(
        'oc_create_family_bind_code',
        expect.objectContaining({ p_elder_id: 'elder-1' }),
      );
    });

    it('拒绝数据库角色为家属的账号', async () => {
      const db = createDatabase({
        oc_users: [{ data: [{ role: 'family' }], error: null }],
      });
      mocks.getSupabaseServerClient.mockReturnValue(db.client);

      const response = await generateCode(
        new Request('http://localhost/api/v1/family/generate-code', {
          method: 'POST',
        }) as NextRequest,
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        detail: '仅长辈账号可执行此操作',
      });
      expect(db.rpc).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/family/bind', () => {
    it('数据库限流命中后返回 429，且不查询绑定码', async () => {
      const db = createDatabase(
        {
          oc_users: [{ data: [{ role: 'family' }], error: null }],
        },
        [{ data: { status: 'rate_limited', retry_after: 73.2 }, error: null }],
      );
      mocks.requireUser.mockResolvedValue({
        user_id: 'family-1',
        role: 'family',
      });
      mocks.getSupabaseServerClient.mockReturnValue(db.client);

      const response = await bindFamily(
        jsonRequest('/api/v1/family/bind', {
          bind_code: '123456',
          relation: '父亲',
        }),
      );

      expect(response.status).toBe(429);
      await expect(response.json()).resolves.toEqual({
        detail: '尝试次数过多，请74秒后再试',
      });
      expect(db.rpc).toHaveBeenCalledWith(
        'oc_reserve_family_bind_attempt',
        expect.objectContaining({
          p_family_id: 'family-1',
          p_max_attempts: 5,
        }),
      );
      expect(db.from).not.toHaveBeenCalledWith('oc_elder_family_binds');
    });

    it('兑换时以 pending、未占用且未过期作为原子更新条件', async () => {
      const activatedBind = {
        ...ACTIVE_BIND,
        id: PENDING_BIND.id,
      };
      const db = createDatabase(
        {
          oc_users: [
            { data: [{ role: 'family' }], error: null },
            {
              data: [
                {
                  id: 'elder-1',
                  name: '王奶奶',
                  phone: null,
                  avatar_url: null,
                  last_active_at: null,
                  role: 'elder',
                },
              ],
              error: null,
            },
          ],
          oc_elder_family_binds: [
            { data: [PENDING_BIND], error: null },
            { data: [], error: null },
            { data: [activatedBind], error: null },
          ],
          oc_family_bind_attempt_limits: [{ data: null, error: null }],
        },
        [{ data: { status: 'allowed' }, error: null }],
      );
      mocks.requireUser.mockResolvedValue({
        user_id: 'family-1',
        role: 'family',
      });
      mocks.getSupabaseServerClient.mockReturnValue(db.client);

      const response = await bindFamily(
        jsonRequest('/api/v1/family/bind', {
          bind_code: '123456',
          relation: '父亲',
        }),
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        id: 'bind-pending',
        status: 'active',
        relation: '父亲',
        peer: { name: '王奶奶' },
      });
      expect(db.calls).toEqual(
        expect.arrayContaining([
          {
            table: 'oc_elder_family_binds',
            method: 'is',
            args: ['family_id', null],
          },
          {
            table: 'oc_elder_family_binds',
            method: 'eq',
            args: ['status', 'pending'],
          },
          {
            table: 'oc_elder_family_binds',
            method: 'gt',
            args: ['expires_at', expect.any(String)],
          },
        ]),
      );
      const updateCall = db.calls.find(
        ({ table, method }) =>
          table === 'oc_elder_family_binds' && method === 'update',
      );
      expect(updateCall?.args[0]).toMatchObject({
        family_id: 'family-1',
        relation: '父亲',
        status: 'active',
        bind_code: null,
      });
    });
  });

  describe('PATCH /api/v1/family/binds/:bind_id', () => {
    it('拒绝陌生人修改绑定权限', async () => {
      const db = createDatabase({
        oc_elder_family_binds: [{ data: [ACTIVE_BIND], error: null }],
      });
      mocks.requireUser.mockResolvedValue({ user_id: 'stranger', role: 'elder' });
      mocks.getSupabaseServerClient.mockReturnValue(db.client);

      const response = await updateBind(
        jsonRequest('/api/v1/family/binds/bind-1', {
          can_view_health: false,
        }),
        { params: Promise.resolve({ bind_id: 'bind-1' }) },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        detail: '无权操作该绑定关系',
      });
      expect(db.calls.some(({ method }) => method === 'update')).toBe(false);
    });

    it('拒绝家属给自己提权', async () => {
      const db = createDatabase({
        oc_elder_family_binds: [{ data: [ACTIVE_BIND], error: null }],
      });
      mocks.requireUser.mockResolvedValue({
        user_id: 'family-1',
        role: 'family',
      });
      mocks.getSupabaseServerClient.mockReturnValue(db.client);

      const response = await updateBind(
        jsonRequest('/api/v1/family/binds/bind-1', {
          can_edit_health: true,
          can_edit_medication: true,
        }),
        { params: Promise.resolve({ bind_id: 'bind-1' }) },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        detail: '只有长辈本人可以调整监护权限',
      });
      expect(db.calls.some(({ method }) => method === 'update')).toBe(false);
    });

    it('长辈更新权限时读取和写入均限定 active 绑定', async () => {
      const updated = { ...ACTIVE_BIND, can_edit_medication: false };
      const db = createDatabase({
        oc_elder_family_binds: [
          { data: [ACTIVE_BIND], error: null },
          { data: [updated], error: null },
        ],
      });
      mocks.getSupabaseServerClient.mockReturnValue(db.client);

      const response = await updateBind(
        jsonRequest('/api/v1/family/binds/bind-1', {
          can_edit_medication: false,
        }),
        { params: Promise.resolve({ bind_id: 'bind-1' }) },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        id: 'bind-1',
        can_edit_medication: false,
      });
      const activeConditions = db.calls.filter(
        ({ table, method, args }) =>
          table === 'oc_elder_family_binds' &&
          method === 'eq' &&
          args[0] === 'status' &&
          args[1] === 'active',
      );
      expect(activeConditions).toHaveLength(2);
    });
  });

  describe('DELETE /api/v1/family/binds/:bind_id', () => {
    it('拒绝陌生人解除绑定', async () => {
      const db = createDatabase({
        oc_elder_family_binds: [{ data: [ACTIVE_BIND], error: null }],
      });
      mocks.requireUser.mockResolvedValue({ user_id: 'stranger', role: 'elder' });
      mocks.getSupabaseServerClient.mockReturnValue(db.client);

      const response = await deleteBind(
        new Request('http://localhost/api/v1/family/binds/bind-1', {
          method: 'DELETE',
        }) as NextRequest,
        { params: Promise.resolve({ bind_id: 'bind-1' }) },
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        detail: '无权操作该绑定关系',
      });
      expect(db.calls.some(({ method }) => method === 'update')).toBe(false);
    });

    it('参与方解除绑定时读取和写入均限定 active 绑定', async () => {
      const db = createDatabase({
        oc_elder_family_binds: [
          { data: [ACTIVE_BIND], error: null },
          { data: [{ id: 'bind-1' }], error: null },
        ],
      });
      mocks.requireUser.mockResolvedValue({
        user_id: 'family-1',
        role: 'family',
      });
      mocks.getSupabaseServerClient.mockReturnValue(db.client);

      const response = await deleteBind(
        new Request('http://localhost/api/v1/family/binds/bind-1', {
          method: 'DELETE',
        }) as NextRequest,
        { params: Promise.resolve({ bind_id: 'bind-1' }) },
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ message: '绑定已解除' });
      const activeConditions = db.calls.filter(
        ({ table, method, args }) =>
          table === 'oc_elder_family_binds' &&
          method === 'eq' &&
          args[0] === 'status' &&
          args[1] === 'active',
      );
      expect(activeConditions).toHaveLength(2);
      expect(
        db.calls.find(
          ({ table, method }) =>
            table === 'oc_elder_family_binds' && method === 'update',
        )?.args[0],
      ).toMatchObject({ status: 'inactive' });
    });
  });
});

// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260714170000_family_bind_atomic_limits.sql',
);

describe('家庭绑定安全迁移', () => {
  it('限制每位长辈只能有一个 pending 绑定码', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase();

    expect(sql).toContain('oc_bind_single_pending_elder_unique');
    expect(sql).toMatch(
      /unique index[\s\S]*?\(elder_id\)[\s\S]*?where status = 'pending'/,
    );
  });

  it('在数据库事务锁中失效旧码并创建新码', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase();
    const start = sql.indexOf(
      'create or replace function public.oc_create_family_bind_code',
    );
    const block = sql.slice(start, sql.indexOf('$$;', start) + 3);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(block).toContain('pg_advisory_xact_lock');
    expect(block).toContain("set status = 'inactive'");
    expect(block).toContain("'pending'");
    expect(block).toContain("set search_path = ''");
  });

  it('跨实例限制兑码尝试且不向客户端开放安全函数', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase();

    expect(sql).toContain('create table if not exists public.oc_family_bind_attempt_limits');
    expect(sql).toContain('for update');
    expect(sql).toContain("'rate_limited'");
    expect(sql).toContain('attempt_count = attempt_count + 1');
    expect(sql).toContain('enable row level security');
    expect(sql).toMatch(
      /revoke all on function public\.oc_reserve_family_bind_attempt[\s\S]*?anon[\s\S]*?authenticated/,
    );
    expect(sql).toMatch(
      /grant execute on function public\.oc_reserve_family_bind_attempt[\s\S]*?to service_role/,
    );
  });
});

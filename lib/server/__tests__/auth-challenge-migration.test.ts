// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260713230000_auth_challenges.sql',
);

describe('认证挑战数据库迁移', () => {
  it('创建 oc_ 表并禁止客户端直接访问', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase();

    expect(sql).toContain('create table public.oc_auth_challenges');
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('force row level security');
    expect(sql).toMatch(
      /revoke all on table public\.oc_auth_challenges[\s\S]*?anon[\s\S]*?authenticated[\s\S]*?service_role/,
    );
  });

  it('所有 RPC 都固定 search_path，且只允许 service_role 执行', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase();
    const functions = [
      'oc_auth_challenge_put_captcha',
      'oc_auth_challenge_consume_captcha',
      'oc_auth_challenge_reserve_otp',
      'oc_auth_challenge_activate_otp',
      'oc_auth_challenge_rollback_otp',
      'oc_auth_challenge_consume_otp',
    ];

    for (const name of functions) {
      const start = sql.indexOf(`create or replace function public.${name}`);
      expect(start, `${name} 必须存在`).toBeGreaterThanOrEqual(0);
      const block = sql.slice(start, sql.indexOf('$$;', start) + 3);
      expect(block).toContain('security definer');
      expect(block).toContain("set search_path = ''");
      expect(sql).toContain(`grant execute on function public.${name}`);
    }
    expect(sql).not.toMatch(/grant execute[\s\S]*?\bto\s+(anon|authenticated|public)\b/);
  });

  it('限流和一次消费在事务锁内完成，并在猜错过多后锁定', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase();

    expect(sql.match(/pg_advisory_xact_lock/g)?.length).toBeGreaterThanOrEqual(3);
    expect(sql).toContain("state = 'consumed'");
    expect(sql).toContain('attempt_count = attempt_count + 1');
    expect(sql).toContain("state = 'locked'");
    expect(sql).toContain('retry_after');
  });

  it('挑战表不声明邮箱、答案或明文验证码列', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase();
    const tableStart = sql.indexOf('create table public.oc_auth_challenges');
    const tableEnd = sql.indexOf(');', tableStart);
    const table = sql.slice(tableStart, tableEnd);

    expect(table).toContain('lookup_key');
    expect(table).toContain('secret_digest');
    expect(table).not.toMatch(/\b(email|answer|code)\b/);
  });
});

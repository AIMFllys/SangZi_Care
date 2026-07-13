// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260713230000_auth_challenges.sql',
  ),
  'utf8',
).toLowerCase();

function functionBlock(name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}`);
  expect(start, `${name} 必须存在`).toBeGreaterThanOrEqual(0);
  const end = sql.indexOf('$$;', start);
  expect(end, `${name} 必须闭合`).toBeGreaterThan(start);
  return sql.slice(start, end + 3);
}

describe('认证挑战 SQL 加固', () => {
  it('所有 RPC 对 NULL 参数失败关闭', () => {
    const requiredParameters: Record<string, string[]> = {
      oc_auth_challenge_put_captcha: [
        'p_lookup_key',
        'p_secret_digest',
        'p_ttl_seconds',
      ],
      oc_auth_challenge_consume_captcha: [
        'p_lookup_key',
        'p_secret_digest',
      ],
      oc_auth_challenge_reserve_otp: [
        'p_lookup_key',
        'p_secret_digest',
        'p_ttl_seconds',
        'p_rate_limit_seconds',
      ],
      oc_auth_challenge_activate_otp: ['p_lookup_key', 'p_version'],
      oc_auth_challenge_rollback_otp: ['p_lookup_key', 'p_version'],
      oc_auth_challenge_consume_otp: [
        'p_lookup_key',
        'p_secret_digest',
        'p_max_attempts',
      ],
    };

    for (const [name, parameters] of Object.entries(requiredParameters)) {
      const block = functionBlock(name);
      for (const parameter of parameters) {
        expect(block, `${name} 必须拒绝 ${parameter}=NULL`)
          .toContain(`${parameter} is null`);
      }
    }
  });

  it('所有时间判断都在取得 advisory lock 后取当前时间', () => {
    const functions = [
      'oc_auth_challenge_put_captcha',
      'oc_auth_challenge_consume_captcha',
      'oc_auth_challenge_reserve_otp',
      'oc_auth_challenge_activate_otp',
      'oc_auth_challenge_consume_otp',
    ];

    for (const name of functions) {
      const block = functionBlock(name);
      const lock = block.indexOf('pg_advisory_xact_lock');
      const clock = block.indexOf('v_now := pg_catalog.clock_timestamp()');
      expect(clock, `${name} 必须在等待锁后刷新 v_now`).toBeGreaterThan(lock);
    }
  });

  it('机会式清理跳过锁定行且每次最多删除 100 条', () => {
    for (const name of [
      'oc_auth_challenge_put_captcha',
      'oc_auth_challenge_reserve_otp',
    ]) {
      const block = functionBlock(name);
      expect(block).toContain('for update skip locked');
      expect(block).toContain('limit 100');
    }
  });

  it('按版本回滚使预留失效但保留限流冷却记录', () => {
    const block = functionBlock('oc_auth_challenge_rollback_otp');

    expect(block).not.toContain('delete from public.oc_auth_challenges');
    expect(block).toContain("state = 'consumed'");
    expect(block).toContain('version::text = p_version');
  });

  it('OTP 到期优先于历史锁定态，避免过期后永久返回 locked', () => {
    const block = functionBlock('oc_auth_challenge_consume_otp');
    const expiryCheck = block.indexOf('v_challenge.expires_at <= v_now');
    const lockedCheck = block.indexOf("v_challenge.state = 'locked'");

    expect(expiryCheck).toBeGreaterThanOrEqual(0);
    expect(expiryCheck).toBeLessThan(lockedCheck);
  });
});

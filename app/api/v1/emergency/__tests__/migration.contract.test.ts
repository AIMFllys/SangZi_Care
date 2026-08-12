// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260813010000_emergency_atomic_notifications.sql'),
  'utf8',
);

describe('SOS 原子通知迁移契约', () => {
  it('用 request_id 唯一约束与行锁实现重放幂等', () => {
    expect(source).toMatch(/add column if not exists request_id uuid/);
    expect(source).toMatch(/unique index[\s\S]*\(user_id, request_id\)/);
    expect(source).toMatch(/on conflict \(user_id, request_id\) where request_id is not null do nothing/);
    expect(source).toMatch(/v_call\.trigger_method is distinct from p_trigger_method/);
    expect(source).toMatch(/v_call\.location is distinct from p_location/);
    expect(source).toContain('emergency_request_conflict');
    expect(source).toMatch(/errcode = 'P0001', message = 'emergency_request_conflict'/);
    expect(source).toMatch(/role = 'elder'[\s\S]*errcode = 'P0001', message = 'invalid_emergency_actor'/);
  });

  it('同一安全函数原子创建事件与 system 消息', () => {
    expect(source).toMatch(/create or replace function public\.oc_trigger_emergency/);
    expect(source).toMatch(/insert into public\.oc_elder_care_messages/);
    expect(source).toMatch(/'text',[\s\S]*'system'/);
    expect(source).toMatch(/can_receive_emergency is true/);
    expect(source).toMatch(/status = 'active'/);
    expect(source).toContain("'【SOS 紧急求助】");
    expect(source).toMatch(/'text',[\s\S]*'system',[\s\S]*false, false/);
  });

  it('函数固定 search_path 且只授权 service_role', () => {
    expect(source).toMatch(/security definer[\s\S]*set search_path = public, pg_temp/);
    expect(source).toMatch(/revoke all on function[\s\S]*from public, anon, authenticated/);
    expect(source).toMatch(/grant execute on function[\s\S]*to service_role/);
  });
});

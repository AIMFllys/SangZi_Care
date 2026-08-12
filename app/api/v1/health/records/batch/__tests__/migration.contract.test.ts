// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(
  process.cwd(), 'supabase/migrations/20260813030000_health_batch_records.sql',
), 'utf8');

describe('健康记录批量事务 RPC 契约', () => {
  it('限制最多五条并在统一函数中完成整批写入', () => {
    expect(sql).toMatch(/create or replace function public\.oc_create_health_records_batch/);
    expect(sql).toMatch(/jsonb_array_length\(p_records\) > 5/);
    expect(sql).toMatch(/for v_record in select value from jsonb_array_elements\(p_records\)/g);
    expect(sql).toMatch(/insert into public\.oc_health_records/);
    expect(sql).toMatch(/returning \* into v_row/);
  });

  it('数据库重新校验代录权限并且只授权 service_role', () => {
    expect(sql).toMatch(/can_edit_health is true/);
    expect(sql).toMatch(/security definer[\s\S]*set search_path = public, pg_temp/);
    expect(sql).toMatch(/revoke all on function[\s\S]*from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function[\s\S]*to service_role/);
  });
});

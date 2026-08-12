// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(
  process.cwd(),
  'supabase/migrations/20260813020000_contact_preferences.sql',
), 'utf8');

describe('联系人私有偏好迁移', () => {
  it('按 owner/peer 隔离且约束备注规范', () => {
    expect(sql).toMatch(/primary key \(owner_id, peer_id\)/);
    expect(sql).toMatch(/owner_id <> peer_id/);
    expect(sql).toMatch(/alias = btrim\(alias\)/);
    expect(sql).toMatch(/char_length\(alias\) between 1 and 40/);
    expect(sql).toMatch(/references public\.oc_users\(id\) on delete cascade/);
  });

  it('只允许 service_role 访问', () => {
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/revoke all on table[\s\S]*from public, anon, authenticated/);
    expect(sql).toMatch(/grant select, insert, update, delete[\s\S]*to service_role/);
  });
});

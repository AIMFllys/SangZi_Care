// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260715020000_message_overview_rpc.sql'),
  'utf8',
).toLowerCase();

describe('message overview RPC migration', () => {
  it('只聚合 active 家庭联系人并返回最新消息和精确未读数', () => {
    expect(sql).toContain("bind.status = 'active'");
    expect(sql).toContain('row_number() over');
    expect(sql).toContain('count(*) filter');
    expect(sql).toContain("coalesce(category, 'chat')");
  });

  it('不返回私有音频路径且只允许 service_role 执行', () => {
    expect(sql).toContain("'audio_url', null");
    expect(sql).toContain('security definer');
    expect(sql).toContain('set search_path = public, pg_temp');
    expect(sql).toContain('revoke all on function public.oc_get_message_overview(uuid)');
    expect(sql).toContain('to service_role');
  });
});

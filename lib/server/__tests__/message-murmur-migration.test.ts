// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260715013000_message_categories_and_ai_murmurs.sql',
  ),
  'utf8',
).toLowerCase();

describe('message categories and AI murmurs migration', () => {
  it('为消息增加受约束的 chat/murmur/system 分类', () => {
    expect(sql).toContain('add column if not exists category text not null');
    expect(sql).toContain("category in ('chat', 'murmur', 'system')");
  });

  it('碎碎念表启用强制 RLS 且客户端角色无表权限', () => {
    expect(sql).toContain('create table if not exists public.oc_ai_murmurs');
    expect(sql).toContain('alter table public.oc_ai_murmurs enable row level security');
    expect(sql).toContain('alter table public.oc_ai_murmurs force row level security');
    expect(sql).toContain('revoke all on table public.oc_ai_murmurs from public, anon, authenticated');
  });

  it('分享通过原子 RPC 发送 murmur 消息且仅 service_role 可执行', () => {
    expect(sql).toContain('create or replace function public.oc_share_ai_murmur');
    expect(sql).toContain("'murmur'");
    expect(sql).toContain('security definer');
    expect(sql).toContain('set search_path = public, pg_temp');
    expect(sql).toContain('grant execute on function public.oc_share_ai_murmur(uuid, uuid, text)');
    expect(sql).toContain('to service_role');
  });
});

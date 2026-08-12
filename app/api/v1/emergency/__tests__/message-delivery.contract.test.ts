// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('SOS system 消息跨层读取契约', () => {
  it('迁移写入的字段同时被概览 RPC 与消息映射读取', () => {
    const emergency = readFileSync(resolve(
      process.cwd(),
      'supabase/migrations/20260813010000_emergency_atomic_notifications.sql',
    ), 'utf8');
    const overview = readFileSync(resolve(
      process.cwd(),
      'supabase/migrations/20260715020000_message_overview_rpc.sql',
    ), 'utf8');
    const messageLib = readFileSync(resolve(
      process.cwd(),
      'app/api/v1/messages/_lib.ts',
    ), 'utf8');

    for (const field of ['sender_id', 'receiver_id', 'type', 'category', 'content', 'is_read', 'created_at']) {
      expect(emergency).toContain(field);
      expect(overview).toContain(field);
    }
    expect(emergency).toContain("'system'");
    expect(messageLib).toContain("'system'");
  });
});

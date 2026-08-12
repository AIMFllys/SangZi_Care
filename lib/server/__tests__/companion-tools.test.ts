// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildCompanionSystemPrompt,
  executeCompanionToolCall,
  hasExplicitFamilyShareConsent,
  selectMurmurSourceText,
} from '../companion-tools';
import type { MimoToolCall } from '../mimo';
import type { Database } from '@/types/supabase';

function toolCall(name: string, args: Record<string, unknown>): MimoToolCall {
  return {
    id: `call-${name}`,
    type: 'function',
    function: { name, arguments: JSON.stringify(args) },
  };
}

function createClient(options: {
  insertData?: unknown[];
  insertError?: unknown;
  rpcData?: string[];
  rpcError?: unknown;
} = {}) {
  const select = vi.fn().mockResolvedValue({
    data: options.insertData ?? [{ id: 'row-1' }],
    error: options.insertError ?? null,
  });
  const insert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ insert }));
  const rpc = vi.fn().mockResolvedValue({
    data: options.rpcData ?? [],
    error: options.rpcError ?? null,
  });
  return {
    client: { from, rpc } as unknown as SupabaseClient<Database>,
    from,
    insert,
    rpc,
  };
}

const elder = { id: 'elder-1', name: '王奶奶', role: 'elder' };

describe('companion share consent', () => {
  it('陪伴提示词要求完整健康数值、明确分享同意和如实工具结果', () => {
    const prompt = buildCompanionSystemPrompt(elder);
    expect(prompt).toContain('信息不完整必须先追问');
    expect(prompt).toContain('明确说');
    expect(prompt).toContain('share_with_family');
    expect(prompt).toContain('不要声称未成功的操作已经完成');
  });

  it('直接要求同步给女儿属于明确同意', () => {
    expect(hasExplicitFamilyShareConsent([
      { role: 'user', content: '把我今天去公园的事告诉女儿吧' },
    ])).toBe(true);
  });

  it('拒绝、含糊回应或无前置询问不会授权分享', () => {
    expect(hasExplicitFamilyShareConsent([
      { role: 'assistant', content: '需要我同步给家人吗？' },
      { role: 'user', content: '先不要' },
    ])).toBe(false);
    expect(hasExplicitFamilyShareConsent([
      { role: 'user', content: '好的' },
    ])).toBe(false);
  });

  it('在助手明确询问后回答可以属于明确同意', () => {
    expect(hasExplicitFamilyShareConsent([
      { role: 'user', content: '今天在公园遇见老朋友，很开心' },
      { role: 'assistant', content: '需要我把这条碎碎念同步给家人吗？' },
      { role: 'user', content: '可以' },
    ])).toBe(true);
  });

  it('同意轮仍选择前一条有意义原话作为碎碎念来源', () => {
    expect(selectMurmurSourceText([
      { role: 'user', content: '今天在公园遇见老朋友，很开心' },
      { role: 'assistant', content: '要告诉家人吗？' },
      { role: 'user', content: '好的' },
    ])).toBe('今天在公园遇见老朋友，很开心');
  });
});

describe('executeCompanionToolCall', () => {
  it('把完整心率数值写入真实健康记录并保留语音 AI 来源', async () => {
    const database = createClient();
    const result = await executeCompanionToolCall(
      toolCall('record_health_metric', {
        record_type: 'heart_rate',
        value: 108,
        symptoms: '刚走完路',
      }),
      {
        supabase: database.client,
        user: elder,
        sourceText: '我刚测心率一百零八，刚走完路',
        explicitShareConsent: false,
      },
    );

    expect(result.actions).toContainEqual({
      type: 'health_recorded', label: '已记录心率', status: 'success', success: true,
    });
    expect(database.from).toHaveBeenCalledWith('oc_health_records');
    expect(database.insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'elder-1',
      record_type: 'heart_rate',
      values: { value: 108 },
      input_method: 'voice_ai',
      recorded_by: 'elder-1',
      is_abnormal: true,
      symptoms: '刚走完路',
    }));
  });

  it('数值不完整时拒绝写入，不猜测健康数据', async () => {
    const database = createClient();
    const result = await executeCompanionToolCall(
      toolCall('record_health_metric', { record_type: 'blood_pressure', systolic: 120 }),
      {
        supabase: database.client,
        user: elder,
        sourceText: '高压一百二',
        explicitShareConsent: false,
      },
    );

    expect(result.actions[0]).toMatchObject({
      type: 'tool_error', status: 'error', success: false,
    });
    expect(database.from).not.toHaveBeenCalled();
  });

  it('没有明确同意时只私密保存碎碎念且不调用分享 RPC', async () => {
    const database = createClient();
    const result = await executeCompanionToolCall(
      toolCall('save_murmur', {
        summary: '今天在公园遇见老朋友，心情很好。',
        share_with_family: true,
      }),
      {
        supabase: database.client,
        user: elder,
        sourceText: '今天在公园遇见老朋友，很开心',
        explicitShareConsent: false,
      },
    );

    expect(database.from).toHaveBeenCalledWith('oc_ai_murmurs');
    expect(database.rpc).not.toHaveBeenCalled();
    expect(result.actions.map((action) => action.type)).toEqual([
      'murmur_saved',
      'share_consent_required',
    ]);
  });

  it('明确同意后通过原子 RPC 同步给所有 active 家属', async () => {
    const database = createClient({ rpcData: ['message-1', 'message-2'] });
    const result = await executeCompanionToolCall(
      toolCall('save_murmur', {
        summary: '今天在公园遇见老朋友，心情很好。',
        share_with_family: true,
      }),
      {
        supabase: database.client,
        user: elder,
        sourceText: '把今天遇见老朋友的事告诉孩子吧',
        explicitShareConsent: true,
      },
    );

    expect(database.rpc).toHaveBeenCalledWith('oc_share_ai_murmur', {
      p_murmur_id: 'row-1',
      p_elder_id: 'elder-1',
      p_summary: '今天在公园遇见老朋友，心情很好。',
    });
    expect(result.actions).toContainEqual({
      type: 'murmur_shared', label: '已同步 2 位家属', status: 'success', success: true,
    });
  });

  it('明确同意但没有已绑定家属时返回未发送 warning，而不是假装全部成功', async () => {
    const database = createClient({ rpcData: [] });

    const result = await executeCompanionToolCall(
      toolCall('save_murmur', {
        summary: '今天晒了太阳。',
        share_with_family: true,
      }),
      {
        supabase: database.client,
        user: elder,
        sourceText: '把今天晒太阳的事告诉孩子吧',
        explicitShareConsent: true,
      },
    );

    expect(result.actions).toContainEqual({
      type: 'no_family_recipients',
      label: '暂无已绑定家属，本次未发送',
      status: 'warning',
      success: false,
    });
  });

  it('分享 RPC 技术失败时保留已保存 success，并返回同步 error', async () => {
    const database = createClient({ rpcError: { code: 'PGRST500' } });

    const result = await executeCompanionToolCall(
      toolCall('save_murmur', {
        summary: '今天晒了太阳。',
        share_with_family: true,
      }),
      {
        supabase: database.client,
        user: elder,
        sourceText: '把今天晒太阳的事告诉孩子吧',
        explicitShareConsent: true,
      },
    );

    expect(result.actions).toEqual([
      expect.objectContaining({ type: 'murmur_saved', status: 'success', success: true }),
      expect.objectContaining({ type: 'tool_error', status: 'error', success: false }),
    ]);
  });
});

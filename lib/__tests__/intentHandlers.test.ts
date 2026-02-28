import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleSendMessageIntent,
  handleHealthRecordIntent,
  handleMedicationConfirmIntent,
  handleMakeCallIntent,
  handleEmergencyIntent,
  handleQueryMedicationIntent,
  handleQueryHealthIntent,
  dispatchIntent,
  type IntentResult,
  type IntentHandlerContext,
} from '../intentHandlers';

// ---------- Mock fetchApi ----------

let mockFetchApi = vi.fn();
vi.mock('@/lib/api', () => ({
  fetchApi: (...args: unknown[]) => mockFetchApi(...args),
}));

// ---------- 测试辅助 ----------

function createContext(overrides?: Partial<IntentHandlerContext>): IntentHandlerContext {
  return {
    userId: 'elder-001',
    familyBinds: [
      {
        bind: { relation: '女儿', elder_id: 'elder-001', family_id: 'family-001' },
        user: { id: 'family-001', name: '小红' },
      },
      {
        bind: { relation: '儿子', elder_id: 'elder-001', family_id: 'family-002' },
        user: { id: 'family-002', name: '小明' },
      },
    ],
    sendMessage: vi.fn().mockResolvedValue({ id: 'msg-001' }),
    makeCall: vi.fn(),
    triggerEmergency: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchApi = vi.fn();
});

// ---------- handleSendMessageIntent ----------

describe('handleSendMessageIntent', () => {
  it('成功发送消息给匹配的家属', async () => {
    const result: IntentResult = {
      intent: 'send_message',
      entities: { target_relation: '女儿', message_content: '周末来看我' },
      confidence: 0.95,
    };
    const ctx = createContext();
    const res = await handleSendMessageIntent(result, ctx);
    expect(res.success).toBe(true);
    expect(res.message).toContain('小红');
    expect(ctx.sendMessage).toHaveBeenCalledWith('family-001', '周末来看我');
  });

  it('支持 target/content 作为实体字段名', async () => {
    const result: IntentResult = {
      intent: 'send_message',
      entities: { target: '儿子', content: '记得吃饭' },
      confidence: 0.9,
    };
    const ctx = createContext();
    const res = await handleSendMessageIntent(result, ctx);
    expect(res.success).toBe(true);
    expect(ctx.sendMessage).toHaveBeenCalledWith('family-002', '记得吃饭');
  });

  it('未识别到目标关系时返回失败', async () => {
    const result: IntentResult = {
      intent: 'send_message',
      entities: { message_content: '你好' },
      confidence: 0.8,
    };
    const ctx = createContext();
    const res = await handleSendMessageIntent(result, ctx);
    expect(res.success).toBe(false);
    expect(res.message).toContain('没有识别到');
  });

  it('找不到匹配的家属时返回失败', async () => {
    const result: IntentResult = {
      intent: 'send_message',
      entities: { target_relation: '老伴', message_content: '你好' },
      confidence: 0.9,
    };
    const ctx = createContext();
    const res = await handleSendMessageIntent(result, ctx);
    expect(res.success).toBe(false);
    expect(res.message).toContain('绑定');
  });

  it('没有消息内容时提示用户补充', async () => {
    const result: IntentResult = {
      intent: 'send_message',
      entities: { target_relation: '女儿' },
      confidence: 0.85,
    };
    const ctx = createContext();
    const res = await handleSendMessageIntent(result, ctx);
    expect(res.success).toBe(false);
    expect(res.message).toContain('说什么');
  });

  it('发送消息失败时返回错误', async () => {
    const result: IntentResult = {
      intent: 'send_message',
      entities: { target_relation: '女儿', message_content: '周末来看我' },
      confidence: 0.95,
    };
    const ctx = createContext({
      sendMessage: vi.fn().mockRejectedValue(new Error('网络错误')),
    });
    const res = await handleSendMessageIntent(result, ctx);
    expect(res.success).toBe(false);
    expect(res.message).toContain('发送失败');
  });

  it('家属列表为空时返回失败', async () => {
    const result: IntentResult = {
      intent: 'send_message',
      entities: { target_relation: '女儿', message_content: '你好' },
      confidence: 0.9,
    };
    const ctx = createContext({ familyBinds: [] });
    const res = await handleSendMessageIntent(result, ctx);
    expect(res.success).toBe(false);
    expect(res.message).toContain('绑定');
  });
});

// ---------- handleHealthRecordIntent ----------

describe('handleHealthRecordIntent', () => {
  it('记录血压数据', async () => {
    mockFetchApi.mockResolvedValueOnce({ id: 'r1' });
    const result: IntentResult = {
      intent: 'health_record',
      entities: { systolic: '135', diastolic: '88' },
      confidence: 0.9,
    };
    const res = await handleHealthRecordIntent(result, createContext());
    expect(res.success).toBe(true);
    expect(res.message).toContain('135');
    expect(res.message).toContain('88');
    expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/health/records', expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({ record_type: 'blood_pressure' }),
    }));
  });

  it('记录血糖数据', async () => {
    mockFetchApi.mockResolvedValueOnce({ id: 'r2' });
    const result: IntentResult = {
      intent: 'health_record',
      entities: { blood_sugar: '6.5' },
      confidence: 0.9,
    };
    const res = await handleHealthRecordIntent(result, createContext());
    expect(res.success).toBe(true);
    expect(res.message).toContain('6.5');
  });

  it('记录心率数据', async () => {
    mockFetchApi.mockResolvedValueOnce({ id: 'r3' });
    const result: IntentResult = {
      intent: 'health_record',
      entities: { heart_rate: '72' },
      confidence: 0.9,
    };
    const res = await handleHealthRecordIntent(result, createContext());
    expect(res.success).toBe(true);
    expect(res.message).toContain('72');
  });

  it('无健康数据实体时返回失败', async () => {
    const result: IntentResult = {
      intent: 'health_record',
      entities: {},
      confidence: 0.9,
    };
    const res = await handleHealthRecordIntent(result, createContext());
    expect(res.success).toBe(false);
    expect(res.message).toContain('没有识别到');
  });

  it('API失败时返回错误', async () => {
    mockFetchApi.mockRejectedValueOnce(new Error('fail'));
    const result: IntentResult = {
      intent: 'health_record',
      entities: { systolic: '135', diastolic: '88' },
      confidence: 0.9,
    };
    const res = await handleHealthRecordIntent(result, createContext());
    expect(res.success).toBe(false);
    expect(res.message).toContain('失败');
  });
});

// ---------- handleMedicationConfirmIntent ----------

describe('handleMedicationConfirmIntent', () => {
  it('确认服药成功', async () => {
    mockFetchApi
      .mockResolvedValueOnce([{ plan_id: 'p1', scheduled_time: '08:00', medicine_name: '降压药', status: 'pending' }])
      .mockResolvedValueOnce({ id: 'r1' });
    const result: IntentResult = { intent: 'medication_confirm', entities: {}, confidence: 0.9 };
    const res = await handleMedicationConfirmIntent(result, createContext());
    expect(res.success).toBe(true);
    expect(res.message).toContain('降压药');
  });

  it('无待服药物时提示', async () => {
    mockFetchApi.mockResolvedValueOnce([{ plan_id: 'p1', status: 'taken' }]);
    const result: IntentResult = { intent: 'medication_confirm', entities: {}, confidence: 0.9 };
    const res = await handleMedicationConfirmIntent(result, createContext());
    expect(res.success).toBe(true);
    expect(res.message).toContain('没有待服用');
  });

  it('API失败时返回错误', async () => {
    mockFetchApi.mockRejectedValueOnce(new Error('fail'));
    const result: IntentResult = { intent: 'medication_confirm', entities: {}, confidence: 0.9 };
    const res = await handleMedicationConfirmIntent(result, createContext());
    expect(res.success).toBe(false);
  });
});

// ---------- handleMakeCallIntent ----------

describe('handleMakeCallIntent', () => {
  it('拨打匹配家属电话', async () => {
    const ctx = createContext();
    const result: IntentResult = {
      intent: 'make_call',
      entities: { target_relation: '女儿' },
      confidence: 0.9,
    };
    const res = await handleMakeCallIntent(result, ctx);
    expect(res.success).toBe(true);
    expect(ctx.makeCall).toHaveBeenCalledWith('family-001');
  });

  it('未识别目标时返回失败', async () => {
    const result: IntentResult = { intent: 'make_call', entities: {}, confidence: 0.9 };
    const res = await handleMakeCallIntent(result, createContext());
    expect(res.success).toBe(false);
  });

  it('无makeCall能力时返回失败', async () => {
    const ctx = createContext({ makeCall: undefined });
    const result: IntentResult = {
      intent: 'make_call',
      entities: { target_relation: '女儿' },
      confidence: 0.9,
    };
    const res = await handleMakeCallIntent(result, ctx);
    expect(res.success).toBe(false);
    expect(res.message).toContain('不支持');
  });
});

// ---------- handleEmergencyIntent ----------

describe('handleEmergencyIntent', () => {
  it('触发紧急呼叫', async () => {
    const ctx = createContext();
    const result: IntentResult = { intent: 'emergency', entities: {}, confidence: 0.9 };
    const res = await handleEmergencyIntent(result, ctx);
    expect(res.success).toBe(true);
    expect(ctx.triggerEmergency).toHaveBeenCalled();
  });

  it('无triggerEmergency能力时返回失败', async () => {
    const ctx = createContext({ triggerEmergency: undefined });
    const result: IntentResult = { intent: 'emergency', entities: {}, confidence: 0.9 };
    const res = await handleEmergencyIntent(result, ctx);
    expect(res.success).toBe(false);
  });
});

// ---------- handleQueryMedicationIntent ----------

describe('handleQueryMedicationIntent', () => {
  it('查询今日用药计划', async () => {
    mockFetchApi.mockResolvedValueOnce([
      { scheduled_time: '08:00', medicine_name: '降压药', dosage: '1片' },
    ]);
    const result: IntentResult = { intent: 'query_medication', entities: {}, confidence: 0.9 };
    const res = await handleQueryMedicationIntent(result, createContext());
    expect(res.success).toBe(true);
    expect(res.message).toContain('降压药');
  });

  it('无用药计划时提示', async () => {
    mockFetchApi.mockResolvedValueOnce([]);
    const result: IntentResult = { intent: 'query_medication', entities: {}, confidence: 0.9 };
    const res = await handleQueryMedicationIntent(result, createContext());
    expect(res.success).toBe(true);
    expect(res.message).toContain('没有');
  });
});

// ---------- handleQueryHealthIntent ----------

describe('handleQueryHealthIntent', () => {
  it('查询血压数据', async () => {
    mockFetchApi.mockResolvedValueOnce({
      blood_pressure: { values: { systolic: 130, diastolic: 85 } },
    });
    const result: IntentResult = {
      intent: 'query_health',
      entities: { record_type: 'blood_pressure' },
      confidence: 0.9,
    };
    const res = await handleQueryHealthIntent(result, createContext());
    expect(res.success).toBe(true);
    expect(res.message).toContain('130');
  });

  it('无健康记录时提示', async () => {
    mockFetchApi.mockResolvedValueOnce(null);
    const result: IntentResult = { intent: 'query_health', entities: {}, confidence: 0.9 };
    const res = await handleQueryHealthIntent(result, createContext());
    expect(res.success).toBe(true);
    expect(res.message).toContain('暂无');
  });
});

// ---------- dispatchIntent ----------

describe('dispatchIntent', () => {
  it('路由 send_message 意图', async () => {
    const result: IntentResult = {
      intent: 'send_message',
      entities: { target_relation: '儿子', message_content: '早点回来' },
      confidence: 0.9,
    };
    const ctx = createContext();
    const res = await dispatchIntent(result, ctx);
    expect(res.success).toBe(true);
    expect(ctx.sendMessage).toHaveBeenCalledWith('family-002', '早点回来');
  });

  it('路由 health_record 意图', async () => {
    mockFetchApi.mockResolvedValueOnce({ id: 'r1' });
    const result: IntentResult = {
      intent: 'health_record',
      entities: { systolic: '120', diastolic: '80' },
      confidence: 0.9,
    };
    const res = await dispatchIntent(result, createContext());
    expect(res.success).toBe(true);
  });

  it('路由 medication_confirm 意图', async () => {
    mockFetchApi
      .mockResolvedValueOnce([{ plan_id: 'p1', scheduled_time: '08:00', medicine_name: '药', status: 'pending' }])
      .mockResolvedValueOnce({ id: 'r1' });
    const result: IntentResult = { intent: 'medication_confirm', entities: {}, confidence: 0.9 };
    const res = await dispatchIntent(result, createContext());
    expect(res.success).toBe(true);
  });

  it('路由 make_call 意图', async () => {
    const ctx = createContext();
    const result: IntentResult = {
      intent: 'make_call',
      entities: { target_relation: '女儿' },
      confidence: 0.9,
    };
    const res = await dispatchIntent(result, ctx);
    expect(res.success).toBe(true);
    expect(ctx.makeCall).toHaveBeenCalled();
  });

  it('路由 emergency 意图', async () => {
    const ctx = createContext();
    const result: IntentResult = { intent: 'emergency', entities: {}, confidence: 0.9 };
    const res = await dispatchIntent(result, ctx);
    expect(res.success).toBe(true);
    expect(ctx.triggerEmergency).toHaveBeenCalled();
  });

  it('路由 query_medication 意图', async () => {
    mockFetchApi.mockResolvedValueOnce([]);
    const result: IntentResult = { intent: 'query_medication', entities: {}, confidence: 0.9 };
    const res = await dispatchIntent(result, createContext());
    expect(res.success).toBe(true);
  });

  it('路由 query_health 意图', async () => {
    mockFetchApi.mockResolvedValueOnce(null);
    const result: IntentResult = { intent: 'query_health', entities: {}, confidence: 0.9 };
    const res = await dispatchIntent(result, createContext());
    expect(res.success).toBe(true);
  });

  it('未知意图返回暂不支持', async () => {
    const result: IntentResult = { intent: 'unknown_intent', entities: {}, confidence: 0.5 };
    const res = await dispatchIntent(result, createContext());
    expect(res.success).toBe(false);
    expect(res.message).toBe('暂不支持该操作');
  });

  it('general_chat 意图返回暂不支持', async () => {
    const result: IntentResult = { intent: 'general_chat', entities: {}, confidence: 0.7 };
    const res = await dispatchIntent(result, createContext());
    expect(res.success).toBe(false);
    expect(res.message).toBe('暂不支持该操作');
  });
});

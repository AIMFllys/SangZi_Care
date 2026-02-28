import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------- Mock Supabase ----------

const mockOn = vi.fn().mockReturnThis();
const mockSubscribe = vi.fn().mockReturnThis();
const mockUnsubscribe = vi.fn();

const mockChannel = {
  on: mockOn,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
  },
}));

const {
  subscribeToTable,
  unsubscribeFromTable,
  unsubscribeAll,
  subscribeHealthRecords,
  subscribeMedicationRecords,
  subscribeMedicationPlans,
  subscribeMessages,
  subscribeEmergencyCalls,
} = await import('../realtimeSubscriptions');

describe('realtimeSubscriptions 实时订阅管理', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 清理内部订阅列表
    unsubscribeAll();
  });

  it('subscribeToTable 创建频道并订阅', () => {
    const cb = vi.fn();
    subscribeToTable('health_records', 'user-1', cb, ['INSERT']);
    expect(mockOn).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'health_records' },
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it('重复订阅同一张表时先取消旧订阅', () => {
    const cb = vi.fn();
    subscribeToTable('health_records', 'user-1', cb);
    mockUnsubscribe.mockClear();
    subscribeToTable('health_records', 'user-1', cb);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('unsubscribeFromTable 取消指定表订阅', () => {
    const cb = vi.fn();
    subscribeToTable('medication_plans', 'user-1', cb);
    unsubscribeFromTable('medication_plans');
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('unsubscribeAll 取消所有订阅', () => {
    const cb = vi.fn();
    subscribeToTable('health_records', 'user-1', cb);
    subscribeToTable('medication_records', 'user-1', cb);
    unsubscribeAll();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
  });

  it('subscribeHealthRecords 订阅 INSERT 和 UPDATE', () => {
    subscribeHealthRecords('user-1', vi.fn());
    expect(mockOn).toHaveBeenCalledTimes(2);
  });

  it('subscribeMedicationRecords 只订阅 INSERT', () => {
    subscribeMedicationRecords('user-1', vi.fn());
    expect(mockOn).toHaveBeenCalledTimes(1);
  });

  it('subscribeMedicationPlans 订阅 INSERT/UPDATE/DELETE', () => {
    subscribeMedicationPlans('user-1', vi.fn());
    expect(mockOn).toHaveBeenCalledTimes(3);
  });

  it('subscribeMessages 订阅 INSERT', () => {
    subscribeMessages('user-1', vi.fn());
    expect(mockOn).toHaveBeenCalledTimes(1);
  });

  it('subscribeEmergencyCalls 订阅 INSERT', () => {
    subscribeEmergencyCalls('user-1', vi.fn());
    expect(mockOn).toHaveBeenCalledTimes(1);
  });

  it('subscribeMessages 回调只处理发给当前用户的消息', () => {
    const onMsg = vi.fn();
    subscribeMessages('user-1', onMsg);
    // 获取注册的回调
    const registeredCb = mockOn.mock.calls[0][2];
    // 发给当前用户的消息
    registeredCb({ new: { receiver_id: 'user-1', content: '你好' } });
    expect(onMsg).toHaveBeenCalledWith({ receiver_id: 'user-1', content: '你好' });
    // 发给其他用户的消息
    onMsg.mockClear();
    registeredCb({ new: { receiver_id: 'other', content: '你好' } });
    expect(onMsg).not.toHaveBeenCalled();
  });

  it('subscribeHealthRecords 回调传递 payload.new', () => {
    const onUpdate = vi.fn();
    subscribeHealthRecords('user-1', onUpdate);
    const registeredCb = mockOn.mock.calls[0][2];
    registeredCb({ new: { id: 'r1', record_type: 'blood_pressure' } });
    expect(onUpdate).toHaveBeenCalledWith({ id: 'r1', record_type: 'blood_pressure' });
  });
});

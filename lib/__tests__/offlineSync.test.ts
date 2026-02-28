import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------- Mock ----------

const mockFetchApi = vi.fn().mockResolvedValue({});

vi.mock('@/lib/api', () => ({
  fetchApi: (...args: unknown[]) => mockFetchApi(...args),
}));

const {
  enqueueOfflineAction,
  syncOfflineData,
  getOfflineQueueSize,
  clearOfflineQueue,
  startOfflineSync,
  isOnline,
} = await import('../offlineSync');

describe('offlineSync 离线数据同步', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOfflineQueue();
  });

  it('enqueueOfflineAction 添加操作到队列', () => {
    enqueueOfflineAction('health_record', { record_type: 'blood_pressure' });
    expect(getOfflineQueueSize()).toBe(1);
  });

  it('多次入队累加', () => {
    enqueueOfflineAction('health_record', { a: 1 });
    enqueueOfflineAction('medication_confirm', { b: 2 });
    enqueueOfflineAction('message', { c: 3 });
    expect(getOfflineQueueSize()).toBe(3);
  });

  it('syncOfflineData 同步健康记录', async () => {
    enqueueOfflineAction('health_record', { record_type: 'blood_pressure', values: { systolic: 120 } });
    const count = await syncOfflineData();
    expect(count).toBe(1);
    expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/health/records', {
      method: 'POST',
      body: { record_type: 'blood_pressure', values: { systolic: 120 } },
    });
    expect(getOfflineQueueSize()).toBe(0);
  });

  it('syncOfflineData 同步用药确认', async () => {
    enqueueOfflineAction('medication_confirm', { plan_id: 'p1' });
    await syncOfflineData();
    expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/medicine/records', {
      method: 'POST',
      body: { plan_id: 'p1' },
    });
  });

  it('syncOfflineData 同步消息', async () => {
    enqueueOfflineAction('message', { receiver_id: 'u2', content: '你好' });
    await syncOfflineData();
    expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/messages/send', {
      method: 'POST',
      body: { receiver_id: 'u2', content: '你好' },
    });
  });

  it('syncOfflineData 失败的操作保留在队列中', async () => {
    mockFetchApi.mockRejectedValueOnce(new Error('网络错误'));
    enqueueOfflineAction('health_record', { a: 1 });
    enqueueOfflineAction('message', { b: 2 });
    const count = await syncOfflineData();
    expect(count).toBe(1); // 第二个成功
    expect(getOfflineQueueSize()).toBe(1); // 第一个失败保留
  });

  it('syncOfflineData 空队列返回0', async () => {
    const count = await syncOfflineData();
    expect(count).toBe(0);
    expect(mockFetchApi).not.toHaveBeenCalled();
  });

  it('clearOfflineQueue 清空队列', () => {
    enqueueOfflineAction('health_record', { a: 1 });
    clearOfflineQueue();
    expect(getOfflineQueueSize()).toBe(0);
  });

  it('isOnline 返回布尔值', () => {
    expect(typeof isOnline()).toBe('boolean');
  });

  it('startOfflineSync 返回清理函数', () => {
    const cleanup = startOfflineSync();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });
});

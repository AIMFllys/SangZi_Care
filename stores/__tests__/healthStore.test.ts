import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useHealthStore,
  formatHealthValue,
  formatMeasuredTime,
  RECORD_TYPE_CONFIG,
  RECORD_TYPES,
} from '../healthStore';
import type { HealthRecordResponse } from '../healthStore';

// Mock fetchApi
vi.mock('@/lib/api', () => ({
  fetchApi: vi.fn(),
}));

import { fetchApi } from '@/lib/api';

const mockFetchApi = fetchApi as ReturnType<typeof vi.fn>;

// ---------- 辅助工厂 ----------

function makeRecord(
  overrides: Partial<HealthRecordResponse> = {},
): HealthRecordResponse {
  return {
    id: 'rec-1',
    user_id: 'user-1',
    record_type: 'blood_pressure',
    values: { systolic: 120, diastolic: 80 },
    measured_at: '2024-06-15T08:00:00Z',
    input_method: 'manual',
    is_abnormal: false,
    ...overrides,
  };
}

// ---------- 纯函数测试 ----------

describe('formatHealthValue', () => {
  it('血压格式化为 收缩压/舒张压', () => {
    expect(formatHealthValue('blood_pressure', { systolic: 135, diastolic: 88 })).toBe('135/88');
  });

  it('血压部分缺失时显示 --', () => {
    expect(formatHealthValue('blood_pressure', { systolic: 120 })).toBe('120/--');
    expect(formatHealthValue('blood_pressure', { diastolic: 80 })).toBe('--/80');
  });

  it('心率格式化为数值', () => {
    expect(formatHealthValue('heart_rate', { value: 72 })).toBe('72');
  });

  it('血糖格式化为数值', () => {
    expect(formatHealthValue('blood_sugar', { value: 5.6 })).toBe('5.6');
  });

  it('体温格式化为数值', () => {
    expect(formatHealthValue('temperature', { value: 36.5 })).toBe('36.5');
  });

  it('体重格式化为数值', () => {
    expect(formatHealthValue('weight', { value: 65 })).toBe('65');
  });

  it('values 为 null 返回 --', () => {
    expect(formatHealthValue('heart_rate', null as any)).toBe('--');
  });

  it('未知类型返回 --', () => {
    expect(formatHealthValue('unknown', { value: 1 })).toBe('--');
  });

  it('value 为 null 返回 --', () => {
    expect(formatHealthValue('heart_rate', { value: null })).toBe('--');
  });
});

describe('formatMeasuredTime', () => {
  it('格式化为 月/日 时:分', () => {
    const result = formatMeasuredTime('2024-06-15T08:30:00Z');
    // 由于时区差异，只验证包含基本格式
    expect(result).toMatch(/\d+\/\d+ \d{2}:\d{2}/);
  });

  it('空字符串返回空', () => {
    expect(formatMeasuredTime('')).toBe('');
  });
});

describe('RECORD_TYPE_CONFIG', () => {
  it('包含5种记录类型', () => {
    expect(RECORD_TYPES).toHaveLength(5);
    expect(RECORD_TYPES).toContain('blood_pressure');
    expect(RECORD_TYPES).toContain('blood_sugar');
    expect(RECORD_TYPES).toContain('heart_rate');
    expect(RECORD_TYPES).toContain('weight');
    expect(RECORD_TYPES).toContain('temperature');
  });

  it('每种类型有 label、icon、unit', () => {
    for (const type of RECORD_TYPES) {
      const config = RECORD_TYPE_CONFIG[type];
      expect(config.label).toBeTruthy();
      expect(config.icon).toBeTruthy();
      expect(config.unit).toBeTruthy();
    }
  });
});

// ---------- Store 测试 ----------

describe('useHealthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useHealthStore.getState().reset();
  });

  describe('初始状态', () => {
    it('默认值正确', () => {
      const state = useHealthStore.getState();
      expect(state.latestRecords).toEqual({});
      expect(state.trendData).toEqual([]);
      expect(state.selectedType).toBe('blood_pressure');
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchLatest', () => {
    it('成功拉取最新记录', async () => {
      const latestData = {
        blood_pressure: makeRecord({ record_type: 'blood_pressure' }),
        blood_sugar: null,
        heart_rate: makeRecord({ record_type: 'heart_rate', values: { value: 72 } }),
        weight: null,
        temperature: null,
      };
      mockFetchApi.mockResolvedValue(latestData);

      await useHealthStore.getState().fetchLatest();

      const state = useHealthStore.getState();
      expect(state.latestRecords).toEqual(latestData);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/health/records/latest');
    });

    it('拉取失败设置错误信息', async () => {
      mockFetchApi.mockRejectedValue(new Error('网络错误'));

      await useHealthStore.getState().fetchLatest();

      const state = useHealthStore.getState();
      expect(state.error).toBe('网络错误');
      expect(state.loading).toBe(false);
    });
  });

  describe('fetchTrend', () => {
    it('成功拉取趋势数据', async () => {
      const trendRecords = [
        makeRecord({ id: 'r1', measured_at: '2024-06-15T08:00:00Z' }),
        makeRecord({ id: 'r2', measured_at: '2024-06-14T08:00:00Z' }),
      ];
      mockFetchApi.mockResolvedValue(trendRecords);

      await useHealthStore.getState().fetchTrend('blood_pressure', 7);

      const state = useHealthStore.getState();
      expect(state.trendData).toEqual(trendRecords);
      expect(state.selectedType).toBe('blood_pressure');
      expect(state.loading).toBe(false);
      expect(mockFetchApi).toHaveBeenCalledWith(
        '/api/v1/health/records/trend?record_type=blood_pressure&days=7',
      );
    });

    it('默认 days 为 7', async () => {
      mockFetchApi.mockResolvedValue([]);

      await useHealthStore.getState().fetchTrend('heart_rate');

      expect(mockFetchApi).toHaveBeenCalledWith(
        '/api/v1/health/records/trend?record_type=heart_rate&days=7',
      );
    });

    it('拉取失败设置错误信息', async () => {
      mockFetchApi.mockRejectedValue(new Error('服务器错误'));

      await useHealthStore.getState().fetchTrend('blood_pressure');

      const state = useHealthStore.getState();
      expect(state.error).toBe('服务器错误');
      expect(state.loading).toBe(false);
    });
  });

  describe('createRecord', () => {
    it('成功创建记录并返回结果', async () => {
      const newRecord = makeRecord({ id: 'new-rec' });
      mockFetchApi.mockResolvedValue(newRecord);

      const result = await useHealthStore.getState().createRecord({
        record_type: 'blood_pressure',
        values: { systolic: 120, diastolic: 80 },
        measured_at: '2024-06-15T08:00:00Z',
        input_method: 'manual',
      });

      expect(result).toEqual(newRecord);
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/health/records', {
        method: 'POST',
        body: expect.objectContaining({ record_type: 'blood_pressure' }),
      });
    });

    it('创建失败时抛出错误', async () => {
      mockFetchApi.mockRejectedValue(new Error('创建失败'));

      await expect(
        useHealthStore.getState().createRecord({
          record_type: 'heart_rate',
          values: { value: 72 },
          measured_at: '2024-06-15T08:00:00Z',
          input_method: 'manual',
        }),
      ).rejects.toThrow('创建失败');
    });
  });

  describe('setSelectedType', () => {
    it('更新选中类型', () => {
      useHealthStore.getState().setSelectedType('heart_rate');
      expect(useHealthStore.getState().selectedType).toBe('heart_rate');
    });
  });

  describe('reset', () => {
    it('重置所有状态', () => {
      useHealthStore.setState({
        latestRecords: { blood_pressure: makeRecord() },
        trendData: [makeRecord()],
        selectedType: 'heart_rate',
        error: '错误',
      });

      useHealthStore.getState().reset();

      const state = useHealthStore.getState();
      expect(state.latestRecords).toEqual({});
      expect(state.trendData).toEqual([]);
      expect(state.selectedType).toBe('blood_pressure');
      expect(state.error).toBeNull();
    });
  });
});

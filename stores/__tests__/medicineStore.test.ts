import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMedicineStore, calcProgress, groupByPeriod } from '../medicineStore';
import type { TodayTimelineItem, MedicationPlanResponse } from '../medicineStore';

// Mock fetchApi
vi.mock('@/lib/api', () => ({
  fetchApi: vi.fn(),
}));

import { fetchApi } from '@/lib/api';

const mockFetchApi = fetchApi as ReturnType<typeof vi.fn>;

// ---------- 辅助工厂 ----------

function makePlan(overrides: Partial<MedicationPlanResponse> = {}): MedicationPlanResponse {
  return {
    id: 'plan-1',
    user_id: 'user-1',
    medicine_name: '阿司匹林',
    dosage: '100mg',
    schedule_times: ['08:00'],
    repeat_days: null,
    start_date: '2024-01-01',
    end_date: null,
    is_active: true,
    created_by: null,
    unit: null,
    notes: null,
    side_effects: null,
    remind_enabled: true,
    remind_before_minutes: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

function makeTimelineItem(
  overrides: Partial<TodayTimelineItem> = {},
): TodayTimelineItem {
  return {
    plan: makePlan(),
    scheduled_time: '08:00',
    record: null,
    status: 'pending',
    ...overrides,
  };
}

// ---------- 纯函数测试 ----------

describe('calcProgress', () => {
  it('空列表返回 0', () => {
    expect(calcProgress([])).toBe(0);
  });

  it('全部完成返回 100', () => {
    const items = [
      makeTimelineItem({ status: 'taken' }),
      makeTimelineItem({ status: 'taken' }),
    ];
    expect(calcProgress(items)).toBe(100);
  });

  it('部分完成返回正确百分比', () => {
    const items = [
      makeTimelineItem({ status: 'taken' }),
      makeTimelineItem({ status: 'pending' }),
      makeTimelineItem({ status: 'delayed' }),
    ];
    // 1/3 ≈ 33%
    expect(calcProgress(items)).toBe(33);
  });

  it('全部未完成返回 0', () => {
    const items = [
      makeTimelineItem({ status: 'pending' }),
      makeTimelineItem({ status: 'delayed' }),
    ];
    expect(calcProgress(items)).toBe(0);
  });
});

describe('groupByPeriod', () => {
  it('空列表返回空数组', () => {
    expect(groupByPeriod([])).toEqual([]);
  });

  it('按早中晚正确分组', () => {
    const items = [
      makeTimelineItem({ scheduled_time: '07:00' }),
      makeTimelineItem({ scheduled_time: '08:30' }),
      makeTimelineItem({ scheduled_time: '12:00' }),
      makeTimelineItem({ scheduled_time: '14:00' }),
      makeTimelineItem({ scheduled_time: '20:00' }),
    ];
    const groups = groupByPeriod(items);
    expect(groups).toHaveLength(3);
    expect(groups[0].period).toBe('morning');
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].period).toBe('noon');
    expect(groups[1].items).toHaveLength(2);
    expect(groups[2].period).toBe('evening');
    expect(groups[2].items).toHaveLength(1);
  });

  it('只有早上的项时只返回一个分组', () => {
    const items = [makeTimelineItem({ scheduled_time: '09:00' })];
    const groups = groupByPeriod(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].period).toBe('morning');
  });
});

// ---------- Store 测试 ----------

describe('useMedicineStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMedicineStore.getState().reset();
  });

  describe('初始状态', () => {
    it('默认值正确', () => {
      const state = useMedicineStore.getState();
      expect(state.plans).toEqual([]);
      expect(state.todayTimeline).toEqual([]);
      expect(state.todayProgress).toBe(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchPlans', () => {
    it('成功拉取计划列表', async () => {
      const plans = [makePlan()];
      mockFetchApi.mockResolvedValue(plans);

      await useMedicineStore.getState().fetchPlans();

      const state = useMedicineStore.getState();
      expect(state.plans).toEqual(plans);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/medicine/plans');
    });

    it('拉取失败设置错误信息', async () => {
      mockFetchApi.mockRejectedValue(new Error('网络错误'));

      await useMedicineStore.getState().fetchPlans();

      const state = useMedicineStore.getState();
      expect(state.plans).toEqual([]);
      expect(state.error).toBe('网络错误');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('fetchAllPlans', () => {
    it('成功拉取所有计划（含已停用）', async () => {
      const plans = [makePlan(), makePlan({ id: 'plan-2', is_active: false })];
      mockFetchApi.mockResolvedValue(plans);

      await useMedicineStore.getState().fetchAllPlans();

      const state = useMedicineStore.getState();
      expect(state.plans).toEqual(plans);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/medicine/plans?active_only=false');
    });

    it('拉取失败设置错误信息', async () => {
      mockFetchApi.mockRejectedValue(new Error('服务不可用'));

      await useMedicineStore.getState().fetchAllPlans();

      const state = useMedicineStore.getState();
      expect(state.plans).toEqual([]);
      expect(state.error).toBe('服务不可用');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('fetchTodayTimeline', () => {
    it('成功拉取今日时间线并计算进度', async () => {
      const response = {
        date: '2024-06-15',
        items: [
          makeTimelineItem({ status: 'taken' }),
          makeTimelineItem({ scheduled_time: '12:00', status: 'pending' }),
        ],
      };
      mockFetchApi.mockResolvedValue(response);

      await useMedicineStore.getState().fetchTodayTimeline();

      const state = useMedicineStore.getState();
      expect(state.todayTimeline).toHaveLength(2);
      expect(state.todayDate).toBe('2024-06-15');
      expect(state.todayProgress).toBe(50); // 1/2
      expect(state.isLoading).toBe(false);
    });

    it('拉取失败设置错误信息', async () => {
      mockFetchApi.mockRejectedValue(new Error('服务器错误'));

      await useMedicineStore.getState().fetchTodayTimeline();

      const state = useMedicineStore.getState();
      expect(state.error).toBe('服务器错误');
    });
  });

  describe('confirmMedication', () => {
    it('乐观更新时间线状态', async () => {
      // 先设置初始时间线
      const items = [
        makeTimelineItem({
          plan: makePlan({ id: 'p1' }),
          scheduled_time: '08:00',
          status: 'pending',
        }),
      ];
      useMedicineStore.setState({ todayTimeline: items });

      mockFetchApi.mockResolvedValue({});

      await useMedicineStore.getState().confirmMedication('p1', '08:00');

      const state = useMedicineStore.getState();
      expect(state.todayTimeline[0].status).toBe('taken');
      expect(state.todayProgress).toBe(100);
    });

    it('API 失败时回滚状态', async () => {
      const items = [
        makeTimelineItem({
          plan: makePlan({ id: 'p1' }),
          scheduled_time: '08:00',
          status: 'pending',
        }),
      ];
      useMedicineStore.setState({ todayTimeline: items });

      mockFetchApi.mockRejectedValue(new Error('失败'));

      await useMedicineStore.getState().confirmMedication('p1', '08:00');

      const state = useMedicineStore.getState();
      // 回滚到 pending
      expect(state.todayTimeline[0].status).toBe('pending');
      expect(state.todayProgress).toBe(0);
    });

    it('找不到对应项时不执行操作', async () => {
      useMedicineStore.setState({ todayTimeline: [] });

      await useMedicineStore.getState().confirmMedication('nonexistent', '08:00');

      expect(mockFetchApi).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('重置所有状态', () => {
      useMedicineStore.setState({
        plans: [makePlan()],
        todayTimeline: [makeTimelineItem()],
        todayProgress: 50,
        error: '错误',
      });

      useMedicineStore.getState().reset();

      const state = useMedicineStore.getState();
      expect(state.plans).toEqual([]);
      expect(state.todayTimeline).toEqual([]);
      expect(state.todayProgress).toBe(0);
      expect(state.error).toBeNull();
    });
  });

  describe('createPlan', () => {
    it('成功创建计划并追加到列表', async () => {
      const newPlan = makePlan({ id: 'new-plan', medicine_name: '二甲双胍' });
      mockFetchApi.mockResolvedValue(newPlan);

      useMedicineStore.setState({ plans: [makePlan()] });

      const result = await useMedicineStore.getState().createPlan({
        user_id: 'elder-1',
        medicine_name: '二甲双胍',
        dosage: '500mg',
        schedule_times: ['08:00'],
        start_date: '2024-06-15',
      });

      expect(result).toEqual(newPlan);
      expect(useMedicineStore.getState().plans).toHaveLength(2);
      expect(useMedicineStore.getState().plans[1].id).toBe('new-plan');
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/medicine/plans', {
        method: 'POST',
        body: expect.objectContaining({ medicine_name: '二甲双胍' }),
      });
    });

    it('创建失败时抛出错误', async () => {
      mockFetchApi.mockRejectedValue(new Error('创建失败'));

      await expect(
        useMedicineStore.getState().createPlan({
          user_id: 'elder-1',
          medicine_name: '药品',
          dosage: '1片',
          schedule_times: ['08:00'],
          start_date: '2024-06-15',
        }),
      ).rejects.toThrow('创建失败');
    });
  });

  describe('updatePlan', () => {
    it('成功更新计划并替换列表中的项', async () => {
      const original = makePlan({ id: 'p1', dosage: '100mg' });
      const updated = { ...original, dosage: '200mg' };
      mockFetchApi.mockResolvedValue(updated);

      useMedicineStore.setState({ plans: [original] });

      const result = await useMedicineStore.getState().updatePlan('p1', {
        dosage: '200mg',
      });

      expect(result.dosage).toBe('200mg');
      expect(useMedicineStore.getState().plans[0].dosage).toBe('200mg');
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/medicine/plans/p1', {
        method: 'PATCH',
        body: { dosage: '200mg' },
      });
    });

    it('更新失败时抛出错误', async () => {
      mockFetchApi.mockRejectedValue(new Error('更新失败'));

      await expect(
        useMedicineStore.getState().updatePlan('p1', { dosage: '200mg' }),
      ).rejects.toThrow('更新失败');
    });
  });
});

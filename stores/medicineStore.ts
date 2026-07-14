// ============================================================
// 桑梓智护 — 用药数据状态管理 (Zustand 5)
// ============================================================

import { create } from 'zustand';
import { fetchApi } from '@/lib/api';

// ---------- 类型定义（对齐后端响应） ----------

export interface MedicationPlanResponse {
  id: string;
  user_id: string;
  medicine_name: string;
  dosage: string;
  schedule_times: string[];
  repeat_days: number[] | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean | null;
  created_by: string | null;
  unit: string | null;
  notes: string | null;
  side_effects: string | null;
  remind_enabled: boolean | null;
  remind_before_minutes: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MedicationRecordResponse {
  id: string;
  user_id: string;
  plan_id: string;
  scheduled_time: string;
  status: string | null;
  taken_at: string | null;
  delayed_count: number | null;
  notes: string | null;
  created_at: string | null;
  confirmed_by: string | null;
}

export interface TodayTimelineItem {
  plan: MedicationPlanResponse;
  scheduled_time: string;
  scheduled_at: string;
  record: MedicationRecordResponse | null;
  status: 'pending' | 'taken' | 'skipped' | 'delayed';
}

export interface TodayTimelineResponse {
  date: string;
  items: TodayTimelineItem[];
}

/** 创建用药计划请求体 */
export interface MedicationPlanCreate {
  user_id: string;
  medicine_name: string;
  dosage: string;
  schedule_times: string[];
  start_date: string;
  repeat_days?: number[];
  end_date?: string;
  is_active?: boolean;
  created_by?: string;
  unit?: string;
  notes?: string;
  side_effects?: string;
  remind_enabled?: boolean;
  remind_before_minutes?: number;
}

/** 更新用药计划请求体 */
export interface MedicationPlanUpdate {
  medicine_name?: string;
  dosage?: string;
  schedule_times?: string[];
  repeat_days?: number[];
  start_date?: string;
  end_date?: string | null;
  is_active?: boolean;
  unit?: string;
  notes?: string;
  side_effects?: string;
  remind_enabled?: boolean;
  remind_before_minutes?: number;
}

// ---------- 进度计算 ----------

/** 计算今日用药完成百分比 */
export function calcProgress(items: TodayTimelineItem[]): number {
  if (items.length === 0) return 0;
  const completed = items.filter((i) => i.status === 'taken').length;
  return Math.round((completed / items.length) * 100);
}

// ---------- 时段分组 ----------

export type TimePeriod = 'morning' | 'noon' | 'evening';

export interface TimelineGroup {
  period: TimePeriod;
  label: string;
  items: TodayTimelineItem[];
}

/** 根据 scheduled_time 将时间线项分组为早/中/晚 */
export function groupByPeriod(items: TodayTimelineItem[]): TimelineGroup[] {
  const groups: Record<TimePeriod, TodayTimelineItem[]> = {
    morning: [],
    noon: [],
    evening: [],
  };

  for (const item of items) {
    const hour = parseInt(item.scheduled_time.split(':')[0], 10);
    if (hour < 12) {
      groups.morning.push(item);
    } else if (hour < 18) {
      groups.noon.push(item);
    } else {
      groups.evening.push(item);
    }
  }

  const labels: Record<TimePeriod, string> = {
    morning: '🌅 早上',
    noon: '☀️ 中午',
    evening: '🌙 晚上',
  };

  const periods: TimePeriod[] = ['morning', 'noon', 'evening'];
  return periods
    .filter((p) => groups[p].length > 0)
    .map((p) => ({ period: p, label: labels[p], items: groups[p] }));
}

// ---------- Store ----------

interface MedicineState {
  /** 用药计划列表 */
  plans: MedicationPlanResponse[];
  /** 今日时间线项 */
  todayTimeline: TodayTimelineItem[];
  /** 今日日期 */
  todayDate: string;
  /** 今日完成百分比 */
  todayProgress: number;
  /** 加载状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 请求代次与目标，用于隔离长辈切换前后的异步响应 */
  plansRequestId: number;
  plansTargetKey: string | null;
  timelineRequestId: number;
  timelineTargetKey: string | null;

  /** 拉取用药计划列表（默认仅活跃） */
  fetchPlans: (userId?: string) => Promise<void>;
  /** 拉取所有用药计划（含已停用） */
  fetchAllPlans: (userId?: string) => Promise<void>;
  /** 拉取今日时间线 */
  fetchTodayTimeline: (userId?: string) => Promise<void>;
  /** 确认服药 */
  confirmMedication: (planId: string, scheduledAt: string) => Promise<void>;
  /** 创建用药计划 */
  createPlan: (data: MedicationPlanCreate) => Promise<MedicationPlanResponse>;
  /** 更新用药计划 */
  updatePlan: (planId: string, data: MedicationPlanUpdate) => Promise<MedicationPlanResponse>;
  /** 清空状态 */
  reset: () => void;
}

export const useMedicineStore = create<MedicineState>()((set, get) => ({
  plans: [],
  todayTimeline: [],
  todayDate: '',
  todayProgress: 0,
  isLoading: false,
  error: null,
  plansRequestId: 0,
  plansTargetKey: null,
  timelineRequestId: 0,
  timelineTargetKey: null,

  fetchPlans: async (userId) => {
    const targetKey = userId ?? 'self';
    const requestId = get().plansRequestId + 1;
    set((state) => ({
      plansRequestId: requestId,
      plansTargetKey: targetKey,
      plans: state.plansTargetKey === targetKey ? state.plans : [],
      isLoading: true,
      error: null,
    }));
    try {
      const data = await fetchApi<MedicationPlanResponse[]>(
        `/api/v1/medicine/plans${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`,
      );
      if (
        get().plansRequestId !== requestId
        || get().plansTargetKey !== targetKey
      ) return;
      set({ plans: data, isLoading: false });
    } catch (err) {
      if (
        get().plansRequestId !== requestId
        || get().plansTargetKey !== targetKey
      ) return;
      set({
        error: err instanceof Error ? err.message : '加载用药计划失败',
        isLoading: false,
      });
    }
  },

  fetchAllPlans: async (userId) => {
    const targetKey = userId ?? 'self';
    const requestId = get().plansRequestId + 1;
    set((state) => ({
      plansRequestId: requestId,
      plansTargetKey: targetKey,
      plans: state.plansTargetKey === targetKey ? state.plans : [],
      isLoading: true,
      error: null,
    }));
    try {
      const data = await fetchApi<MedicationPlanResponse[]>(
        `/api/v1/medicine/plans?active_only=false${userId ? `&user_id=${encodeURIComponent(userId)}` : ''}`,
      );
      if (
        get().plansRequestId !== requestId
        || get().plansTargetKey !== targetKey
      ) return;
      set({ plans: data, isLoading: false });
    } catch (err) {
      if (
        get().plansRequestId !== requestId
        || get().plansTargetKey !== targetKey
      ) return;
      set({
        error: err instanceof Error ? err.message : '加载用药计划失败',
        isLoading: false,
      });
    }
  },

  fetchTodayTimeline: async (userId) => {
    const targetKey = userId ?? 'self';
    const requestId = get().timelineRequestId + 1;
    set((state) => ({
      timelineRequestId: requestId,
      timelineTargetKey: targetKey,
      todayTimeline:
        state.timelineTargetKey === targetKey ? state.todayTimeline : [],
      todayDate: state.timelineTargetKey === targetKey ? state.todayDate : '',
      todayProgress:
        state.timelineTargetKey === targetKey ? state.todayProgress : 0,
      isLoading: true,
      error: null,
    }));
    try {
      const data = await fetchApi<TodayTimelineResponse>(
        `/api/v1/medicine/today${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`,
      );
      if (
        get().timelineRequestId !== requestId
        || get().timelineTargetKey !== targetKey
      ) return;
      set({
        todayTimeline: data.items,
        todayDate: data.date,
        todayProgress: calcProgress(data.items),
        isLoading: false,
      });
    } catch (err) {
      if (
        get().timelineRequestId !== requestId
        || get().timelineTargetKey !== targetKey
      ) return;
      set({
        error: err instanceof Error ? err.message : '加载今日用药失败',
        isLoading: false,
      });
    }
  },

  confirmMedication: async (planId: string, scheduledAt: string) => {
    const {
      todayTimeline,
      timelineRequestId,
      timelineTargetKey,
    } = get();

    // 找到对应的时间线项获取 user_id
    const item = todayTimeline.find(
      (i) => i.plan.id === planId && i.scheduled_at === scheduledAt,
    );
    if (!item) return;
    const previousStatus = item.status;

    // 乐观更新
    const updatedTimeline = todayTimeline.map((i) =>
      i.plan.id === planId && i.scheduled_at === scheduledAt
        ? { ...i, status: 'taken' as const }
        : i,
    );
    set({
      todayTimeline: updatedTimeline,
      todayProgress: calcProgress(updatedTimeline),
    });

    try {
      await fetchApi('/api/v1/medicine/records', {
        method: 'POST',
        body: {
          user_id: item.plan.user_id,
          plan_id: planId,
          scheduled_time: scheduledAt,
          status: 'taken',
        },
      });
    } catch (error) {
      // 只回滚当前发生项；若期间已经切换/刷新长辈，则丢弃旧操作的回滚。
      if (
        get().timelineRequestId === timelineRequestId
        && get().timelineTargetKey === timelineTargetKey
      ) {
        set((state) => {
          const rolledBackTimeline = state.todayTimeline.map((timelineItem) =>
            timelineItem.plan.id === planId
            && timelineItem.scheduled_at === scheduledAt
              ? { ...timelineItem, status: previousStatus }
              : timelineItem,
          );
          return {
            todayTimeline: rolledBackTimeline,
            todayProgress: calcProgress(rolledBackTimeline),
          };
        });
      }
      throw error;
    }
  },

  createPlan: async (data: MedicationPlanCreate) => {
    const { plansRequestId, plansTargetKey } = get();
    const result = await fetchApi<MedicationPlanResponse>(
      '/api/v1/medicine/plans',
      { method: 'POST', body: data },
    );
    // 仅更新发起操作时的同一目标列表，防止切换长辈后串入旧结果。
    if (
      get().plansRequestId === plansRequestId
      && get().plansTargetKey === plansTargetKey
    ) {
      set((state) => ({ plans: [...state.plans, result] }));
    }
    return result;
  },

  updatePlan: async (planId: string, data: MedicationPlanUpdate) => {
    const { plansRequestId, plansTargetKey } = get();
    const result = await fetchApi<MedicationPlanResponse>(
      `/api/v1/medicine/plans/${planId}`,
      { method: 'PATCH', body: data },
    );
    if (
      get().plansRequestId === plansRequestId
      && get().plansTargetKey === plansTargetKey
    ) {
      set((state) => ({
        plans: state.plans.map((p) => (p.id === planId ? result : p)),
      }));
    }
    return result;
  },

  reset: () => {
    set({
      plans: [],
      todayTimeline: [],
      todayDate: '',
      todayProgress: 0,
      isLoading: false,
      error: null,
      plansRequestId: get().plansRequestId + 1,
      plansTargetKey: null,
      timelineRequestId: get().timelineRequestId + 1,
      timelineTargetKey: null,
    });
  },
}));

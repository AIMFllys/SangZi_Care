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
}

export interface TodayTimelineItem {
  plan: MedicationPlanResponse;
  scheduled_time: string;
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

  /** 拉取用药计划列表（默认仅活跃） */
  fetchPlans: () => Promise<void>;
  /** 拉取所有用药计划（含已停用） */
  fetchAllPlans: () => Promise<void>;
  /** 拉取今日时间线 */
  fetchTodayTimeline: () => Promise<void>;
  /** 确认服药 */
  confirmMedication: (planId: string, scheduledTime: string) => Promise<void>;
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

  fetchPlans: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchApi<MedicationPlanResponse[]>(
        '/api/v1/medicine/plans',
      );
      set({ plans: data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '加载用药计划失败',
        isLoading: false,
      });
    }
  },

  fetchAllPlans: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchApi<MedicationPlanResponse[]>(
        '/api/v1/medicine/plans?active_only=false',
      );
      set({ plans: data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '加载用药计划失败',
        isLoading: false,
      });
    }
  },

  fetchTodayTimeline: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchApi<TodayTimelineResponse>(
        '/api/v1/medicine/today',
      );
      set({
        todayTimeline: data.items,
        todayDate: data.date,
        todayProgress: calcProgress(data.items),
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '加载今日用药失败',
        isLoading: false,
      });
    }
  },

  confirmMedication: async (planId: string, scheduledTime: string) => {
    const { todayTimeline } = get();

    // 找到对应的时间线项获取 user_id
    const item = todayTimeline.find(
      (i) => i.plan.id === planId && i.scheduled_time === scheduledTime,
    );
    if (!item) return;

    // 乐观更新
    const updatedTimeline = todayTimeline.map((i) =>
      i.plan.id === planId && i.scheduled_time === scheduledTime
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
          scheduled_time: scheduledTime,
          status: 'taken',
        },
      });
    } catch {
      // 回滚
      set({
        todayTimeline,
        todayProgress: calcProgress(todayTimeline),
      });
    }
  },

  createPlan: async (data: MedicationPlanCreate) => {
    const result = await fetchApi<MedicationPlanResponse>(
      '/api/v1/medicine/plans',
      { method: 'POST', body: data },
    );
    // 将新计划追加到列表
    set((state) => ({ plans: [...state.plans, result] }));
    return result;
  },

  updatePlan: async (planId: string, data: MedicationPlanUpdate) => {
    const result = await fetchApi<MedicationPlanResponse>(
      `/api/v1/medicine/plans/${planId}`,
      { method: 'PATCH', body: data },
    );
    // 更新列表中对应的计划
    set((state) => ({
      plans: state.plans.map((p) => (p.id === planId ? result : p)),
    }));
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
    });
  },
}));

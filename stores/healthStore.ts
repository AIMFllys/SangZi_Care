// ============================================================
// 桑梓智护 — 健康数据状态管理 (Zustand 5)
// ============================================================

import { create } from 'zustand';
import { fetchApi } from '@/lib/api';
import type { HealthValues, HealthRecordType } from '@/types/health';
import { isBloodPressureValues, isSingleValueRecord } from '@/types/health';

// ---------- 类型定义（对齐后端响应） ----------

export interface HealthRecordResponse {
  id: string;
  user_id: string;
  record_type: HealthRecordType;
  values: HealthValues;
  measured_at: string;
  input_method?: string;
  recorded_by?: string;
  is_abnormal?: boolean;
  abnormal_reason?: string;
  notes?: string;
  symptoms?: string;
  created_at?: string;
}

/** 最新记录响应：每种类型一条最新记录 */
export interface LatestRecordsResponse {
  blood_pressure: HealthRecordResponse | null;
  blood_sugar: HealthRecordResponse | null;
  heart_rate: HealthRecordResponse | null;
  weight: HealthRecordResponse | null;
  temperature: HealthRecordResponse | null;
}

/** 创建健康记录请求体 */
export interface HealthRecordCreate {
  user_id?: string;
  record_type: string;
  values: Record<string, unknown>;
  measured_at: string;
  input_method: 'voice' | 'manual' | 'family';
  recorded_by?: string;
  notes?: string;
  symptoms?: string;
}

export interface HealthRecordBatchCreate {
  user_id?: string;
  records: HealthRecordCreate[];
}

// ---------- 记录类型配置 ----------

export const RECORD_TYPE_CONFIG: Record<
  string,
  { label: string; icon: string; unit: string }
> = {
  blood_pressure: { label: '血压', icon: '🩸', unit: 'mmHg' },
  blood_sugar: { label: '血糖', icon: '🍬', unit: 'mmol/L' },
  heart_rate: { label: '心率', icon: '💓', unit: '次/分' },
  weight: { label: '体重', icon: '⚖️', unit: 'kg' },
  temperature: { label: '体温', icon: '🌡️', unit: '°C' },
};

/** 所有支持的记录类型 */
export const RECORD_TYPES = Object.keys(RECORD_TYPE_CONFIG);

// ---------- 格式化工具 ----------

/** 格式化健康数据值为展示字符串 */
export function formatHealthValue(
  type: string,
  values: HealthValues,
): string {
  if (!values) return '--';
  const config = RECORD_TYPE_CONFIG[type];
  if (!config) return '--';

  if (type === 'blood_pressure' && isBloodPressureValues(values)) {
    const s = values.systolic;
    const d = values.diastolic;
    if (s == null && d == null) return '--';
    return `${s ?? '--'}/${d ?? '--'}`;
  }

  if (isSingleValueRecord(values)) {
    const val = values.value;
    if (val == null) return '--';
    return String(val);
  }

  return '--';
}

/** 格式化测量时间为简短展示 */
export function formatMeasuredTime(measuredAt: string): string {
  if (!measuredAt) return '';
  try {
    const date = new Date(measuredAt);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

// ---------- Store ----------

interface HealthState {
  /** 各类型最新记录 */
  latestRecords: Record<string, HealthRecordResponse | null>;
  /** 趋势数据 */
  trendData: HealthRecordResponse[];
  /** 当前选中的记录类型 */
  selectedType: string;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 最新记录请求代次，防止切换长辈后的旧响应覆盖新数据 */
  latestRequestId: number;
  latestTargetKey: string | null;
  /** 趋势请求代次，隔离不同长辈与不同指标 */
  trendRequestId: number;
  trendQueryKey: string | null;

  /** 拉取各类型最新记录 */
  fetchLatest: (userId?: string) => Promise<void>;
  /** 拉取趋势数据 */
  fetchTrend: (recordType: string, days?: number, userId?: string) => Promise<void>;
  /** 创建健康记录 */
  createRecord: (data: HealthRecordCreate) => Promise<HealthRecordResponse>;
  /** 在一个数据库事务中批量创建健康记录 */
  createRecordsBatch: (data: HealthRecordBatchCreate) => Promise<HealthRecordResponse[]>;
  /** 设置选中类型 */
  setSelectedType: (type: string) => void;
  /** 清空状态 */
  reset: () => void;
}

export const useHealthStore = create<HealthState>()((set, get) => ({
  latestRecords: {},
  trendData: [],
  selectedType: 'blood_pressure',
  loading: false,
  error: null,
  latestRequestId: 0,
  latestTargetKey: null,
  trendRequestId: 0,
  trendQueryKey: null,

  fetchLatest: async (userId) => {
    const targetKey = userId ?? 'self';
    const requestId = get().latestRequestId + 1;
    set((state) => ({
      latestRequestId: requestId,
      latestTargetKey: targetKey,
      latestRecords:
        state.latestTargetKey === targetKey ? state.latestRecords : {},
      loading: true,
      error: null,
    }));
    try {
      const data = await fetchApi<LatestRecordsResponse>(
        `/api/v1/health/records/latest${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`,
      );
      if (
        get().latestRequestId !== requestId
        || get().latestTargetKey !== targetKey
      ) return;
      set({ latestRecords: data as unknown as Record<string, HealthRecordResponse | null>, loading: false });
    } catch (err) {
      if (
        get().latestRequestId !== requestId
        || get().latestTargetKey !== targetKey
      ) return;
      set({
        error: err instanceof Error ? err.message : '加载健康数据失败',
        loading: false,
      });
    }
  },

  fetchTrend: async (recordType: string, days = 7, userId) => {
    const queryKey = `${userId ?? 'self'}:${recordType}:${days}`;
    const requestId = get().trendRequestId + 1;
    set((state) => ({
      trendRequestId: requestId,
      trendQueryKey: queryKey,
      trendData: state.trendQueryKey === queryKey ? state.trendData : [],
      selectedType: recordType,
      loading: true,
      error: null,
    }));
    try {
      const data = await fetchApi<HealthRecordResponse[]>(
        `/api/v1/health/records/trend?record_type=${recordType}&days=${days}${userId ? `&user_id=${encodeURIComponent(userId)}` : ''}`,
      );
      if (
        get().trendRequestId !== requestId
        || get().trendQueryKey !== queryKey
      ) return;
      set({ trendData: data, selectedType: recordType, loading: false });
    } catch (err) {
      if (
        get().trendRequestId !== requestId
        || get().trendQueryKey !== queryKey
      ) return;
      set({
        error: err instanceof Error ? err.message : '加载趋势数据失败',
        loading: false,
      });
    }
  },

  createRecord: async (data: HealthRecordCreate) => {
    const result = await fetchApi<HealthRecordResponse>(
      '/api/v1/health/records',
      { method: 'POST', body: data },
    );
    return result;
  },

  createRecordsBatch: async (data: HealthRecordBatchCreate) => {
    const result = await fetchApi<{ records: HealthRecordResponse[] }>(
      '/api/v1/health/records/batch',
      { method: 'POST', body: data },
    );
    return result.records;
  },

  setSelectedType: (type: string) => {
    set({ selectedType: type });
  },

  reset: () => {
    set({
      latestRecords: {},
      trendData: [],
      selectedType: 'blood_pressure',
      loading: false,
      error: null,
      latestRequestId: get().latestRequestId + 1,
      latestTargetKey: null,
      trendRequestId: get().trendRequestId + 1,
      trendQueryKey: null,
    });
  },
}));

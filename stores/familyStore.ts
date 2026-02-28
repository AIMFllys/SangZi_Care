// ============================================================
// 桑梓智护 — 家属绑定关系状态管理 (Zustand 5)
// ============================================================

import { create } from 'zustand';
import { fetchApi } from '@/lib/api';
import type { Tables } from '@/types/supabase';

type ElderFamilyBind = Tables<'elder_family_binds'>;
type User = Tables<'users'>;

/** 绑定关系 + 对方用户信息 */
export interface FamilyBindWithUser {
  bind: ElderFamilyBind;
  user: User;
}

/** 家属端：老人健康摘要 */
export interface ElderHealthSummary {
  medicationStatus: { completed: number; total: number } | null;
  latestBloodPressure: { systolic: number; diastolic: number } | null;
}

interface FamilyState {
  /** 绑定关系列表（含对方用户信息） */
  binds: FamilyBindWithUser[];
  /** 家属端：老人健康摘要（按 userId 索引） */
  healthSummaries: Record<string, ElderHealthSummary>;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;

  /** 拉取绑定列表 */
  fetchBinds: () => Promise<void>;
  /** 拉取老人健康摘要（家属端用） */
  fetchElderHealthSummary: (elderId: string) => Promise<void>;
  /** 清空状态 */
  reset: () => void;
}

export const useFamilyStore = create<FamilyState>()((set, get) => ({
  binds: [],
  healthSummaries: {},
  isLoading: false,
  error: null,

  fetchBinds: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchApi<FamilyBindWithUser[]>('/api/v1/family/binds');
      set({ binds: data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '加载失败',
        isLoading: false,
      });
    }
  },

  fetchElderHealthSummary: async (elderId: string) => {
    try {
      const summary = await fetchApi<ElderHealthSummary>(
        `/api/v1/health/records/latest?user_id=${elderId}`,
      );
      set((state) => ({
        healthSummaries: { ...state.healthSummaries, [elderId]: summary },
      }));
    } catch {
      // 静默失败 — 健康摘要非关键数据
    }
  },

  reset: () => {
    set({ binds: [], healthSummaries: {}, isLoading: false, error: null });
  },
}));

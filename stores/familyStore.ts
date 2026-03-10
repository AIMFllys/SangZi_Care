// ============================================================
// 桑梓智护 — 家属绑定关系状态管理 (Zustand 5)
// ============================================================

import { create } from 'zustand';
import { fetchApi } from '@/lib/api';

/** 后端返回的绑定关系（对齐 FamilyBindResponse） */
export interface FamilyBind {
  id: string;
  elder_id: string;
  family_id: string;
  relation: string;
  status?: string | null;
  bind_code?: string | null;
  can_view_health?: boolean | null;
  can_edit_medication?: boolean | null;
  can_receive_emergency?: boolean | null;
  bound_at?: string | null;
  created_at?: string | null;
}

/** 绑定关系 + 对方用户信息（前端组合） */
export interface FamilyBindWithUser {
  bind: FamilyBind;
  user: {
    id: string;
    name: string;
    phone?: string | null;
    avatar_url?: string | null;
    last_active_at?: string | null;
  };
}

/** 家属端：老人健康摘要 */
export interface ElderHealthSummary {
  medicationStatus: { completed: number; total: number } | null;
  latestBloodPressure: { systolic: number; diastolic: number } | null;
}

interface FamilyState {
  /** 绑定关系列表（含对方用户信息） */
  binds: FamilyBindWithUser[];
  /** 原始绑定数据（后端直接返回的） */
  rawBinds: FamilyBind[];
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

export const useFamilyStore = create<FamilyState>()((set) => ({
  binds: [],
  rawBinds: [],
  healthSummaries: {},
  isLoading: false,
  error: null,

  fetchBinds: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await fetchApi<FamilyBind[]>('/api/v1/family/binds');

      // 将后端的平面数据转换为 FamilyBindWithUser
      // 由于后端目前不返回 user 详情, 用绑定信息构造占位
      const bindsWithUser: FamilyBindWithUser[] = data.map((bind) => ({
        bind,
        user: {
          id: bind.elder_id || bind.family_id || bind.id,
          name: bind.relation || '家人',
        },
      }));

      set({ binds: bindsWithUser, rawBinds: data, isLoading: false });
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
    set({ binds: [], rawBinds: [], healthSummaries: {}, isLoading: false, error: null });
  },
}));

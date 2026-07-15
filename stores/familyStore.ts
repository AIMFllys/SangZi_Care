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
  can_edit_health?: boolean | null;
  can_edit_medication?: boolean | null;
  can_receive_emergency?: boolean | null;
  bound_at?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  peer?: {
    id: string;
    name: string;
    phone?: string | null;
    avatar_url?: string | null;
    last_active_at?: string | null;
    role: string;
  } | null;
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
  /** 当前缓存归属账号，防共用设备串用上一账号数据 */
  ownerUserId: string | null;
  bindsRequestId: number;
  /** 家属端跨页面共享的当前照护长辈 */
  selectedElderId: string | null;

  /** 拉取绑定列表（需传当前用户 ID 以正确识别对方） */
  fetchBinds: (currentUserId: string) => Promise<void>;
  /** 拉取老人健康摘要（家属端用） */
  fetchElderHealthSummary: (elderId: string) => Promise<void>;
  /** 选择当前照护长辈；页面仍会校验其属于 active 绑定 */
  setSelectedElderId: (elderId: string | null) => void;
  /** 清空状态 */
  reset: () => void;
}

export const useFamilyStore = create<FamilyState>()((set, get) => ({
  binds: [],
  rawBinds: [],
  healthSummaries: {},
  isLoading: false,
  error: null,
  ownerUserId: null,
  bindsRequestId: 0,
  selectedElderId: null,

  fetchBinds: async (currentUserId: string) => {
    const requestId = get().bindsRequestId + 1;
    set((state) => ({
      bindsRequestId: requestId,
      ownerUserId: currentUserId,
      binds: state.ownerUserId === currentUserId ? state.binds : [],
      rawBinds: state.ownerUserId === currentUserId ? state.rawBinds : [],
      healthSummaries:
        state.ownerUserId === currentUserId ? state.healthSummaries : {},
      selectedElderId:
        state.ownerUserId === currentUserId ? state.selectedElderId : null,
      isLoading: true,
      error: null,
    }));
    try {
      const data = await fetchApi<FamilyBind[]>('/api/v1/family/binds');

      // 将后端的平面数据转换为 FamilyBindWithUser
      // 关键：根据当前用户 ID 判断"对方"是谁
      // 当前用户是老人 → 对方是 family_id
      // 当前用户是家属 → 对方是 elder_id
      const bindsWithUser: FamilyBindWithUser[] = data.map((bind) => {
        const isCurrentUserElder = bind.elder_id === currentUserId;
        const otherUserId = isCurrentUserElder
          ? (bind.family_id || bind.id)
          : (bind.elder_id || bind.id);

        const peer = bind.peer;
        return {
          bind,
          user: {
            id: peer?.id ?? otherUserId,
            name: peer?.name ?? '家人',
            phone: peer?.phone ?? null,
            avatar_url: peer?.avatar_url ?? null,
            last_active_at: peer?.last_active_at ?? null,
          },
        };
      });

      if (
        get().bindsRequestId !== requestId
        || get().ownerUserId !== currentUserId
      ) return;

      const elderIds = data
        .filter((bind) => bind.family_id === currentUserId && bind.status === 'active')
        .map((bind) => bind.elder_id);
      const currentSelection = get().selectedElderId;
      const selectedElderId = currentSelection && elderIds.includes(currentSelection)
        ? currentSelection
        : elderIds[0] ?? null;

      set({
        binds: bindsWithUser,
        rawBinds: data,
        ownerUserId: currentUserId,
        selectedElderId,
        isLoading: false,
      });
    } catch (err) {
      if (
        get().bindsRequestId !== requestId
        || get().ownerUserId !== currentUserId
      ) return;
      set({
        error: err instanceof Error ? err.message : '加载失败',
        isLoading: false,
      });
    }
  },

  fetchElderHealthSummary: async (elderId: string) => {
    const requestOwner = get().ownerUserId;
    try {
      const summary = await fetchApi<ElderHealthSummary>(
        `/api/v1/health/records/latest?user_id=${elderId}`,
      );
      if (get().ownerUserId !== requestOwner) return;
      set((state) => ({
        healthSummaries: { ...state.healthSummaries, [elderId]: summary },
      }));
    } catch {
      // 静默失败 — 健康摘要非关键数据
    }
  },

  setSelectedElderId: (elderId) => {
    set({ selectedElderId: elderId });
  },

  reset: () => {
    set({
      binds: [],
      rawBinds: [],
      healthSummaries: {},
      isLoading: false,
      error: null,
      ownerUserId: null,
      bindsRequestId: get().bindsRequestId + 1,
      selectedElderId: null,
    });
  },
}));

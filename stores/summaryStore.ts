// ============================================================
// 桑梓智护 — AI对话摘要状态管理 (Zustand 5)
// 管理对话摘要数据，用于首页情感看板
// 需求: 17.1, 17.2, 17.3, 17.4, 17.5
// ============================================================

import { create } from 'zustand';
import { fetchApi } from '@/lib/api';

export interface SummaryState {
  /** 对话摘要文本 */
  summary: string | null;
  /** 对话消息数 */
  messageCount: number;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;

  /** 获取指定用户的对话摘要 */
  fetchSummary: (userId: string) => Promise<void>;
  /** 清空摘要 */
  clear: () => void;
}

export const useSummaryStore = create<SummaryState>()((set) => ({
  summary: null,
  messageCount: 0,
  loading: false,
  error: null,

  fetchSummary: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await fetchApi<{ summary: string; message_count: number }>(
        `/api/v1/ai/summary/${userId}`,
      );
      set({
        summary: res.summary,
        messageCount: res.message_count,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '获取摘要失败',
        loading: false,
      });
    }
  },

  clear: () => set({ summary: null, messageCount: 0, error: null }),
}));

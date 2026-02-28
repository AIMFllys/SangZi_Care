// ============================================================
// 桑梓智护 — 健康广播状态管理 (Zustand 5)
// ============================================================

import { create } from 'zustand';
import { fetchApi } from '@/lib/api';

// ---------- 类型定义（对齐后端响应） ----------

export interface BroadcastResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  audio_url: string | null;
  audio_duration: number | null;
  play_count: number | null;
  is_published: boolean | null;
  target_age_min: number | null;
  target_age_max: number | null;
  target_diseases: string[] | null;
  target_season: string | null;
  ai_prompt: string | null;
  generated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CategoryInfo {
  key: string;
  name: string;
  description: string;
}

// ---------- 工具函数 ----------

/** 将秒数格式化为 MM:SS */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------- Store ----------

interface RadioState {
  /** 推荐广播列表 */
  broadcasts: BroadcastResponse[];
  /** 广播分类 */
  categories: CategoryInfo[];
  /** 当前播放索引 */
  currentIndex: number;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 当前播放位置（秒） */
  currentTime: number;
  /** 总时长（秒） */
  duration: number;
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;

  /** 拉取推荐广播 */
  fetchRecommendations: () => Promise<void>;
  /** 拉取广播分类 */
  fetchCategories: () => Promise<void>;
  /** 播放指定索引 */
  play: (index: number) => void;
  /** 暂停 */
  pause: () => void;
  /** 下一条 */
  next: () => void;
  /** 上一条 */
  prev: () => void;
  /** 跳转到指定时间 */
  seek: (time: number) => void;
  /** 更新当前播放时间 */
  setCurrentTime: (time: number) => void;
  /** 更新总时长 */
  setDuration: (duration: number) => void;
  /** 记录播放历史 */
  recordPlayback: (broadcastId: string, playDuration: number, completed: boolean) => Promise<void>;
  /** 清空状态 */
  reset: () => void;
}

export const useRadioStore = create<RadioState>()((set, get) => ({
  broadcasts: [],
  categories: [],
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  loading: false,
  error: null,

  fetchRecommendations: async () => {
    set({ loading: true, error: null });
    try {
      const data = await fetchApi<BroadcastResponse[]>(
        '/api/v1/radio/recommend',
      );
      set({ broadcasts: data, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '加载推荐广播失败',
        loading: false,
      });
    }
  },

  fetchCategories: async () => {
    try {
      const data = await fetchApi<CategoryInfo[]>(
        '/api/v1/radio/categories',
      );
      set({ categories: data });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '加载分类失败',
      });
    }
  },

  play: (index: number) => {
    const { broadcasts } = get();
    if (index < 0 || index >= broadcasts.length) return;
    const broadcast = broadcasts[index];
    set({
      currentIndex: index,
      isPlaying: true,
      currentTime: 0,
      duration: broadcast.audio_duration ?? 0,
    });
  },

  pause: () => {
    set({ isPlaying: false });
  },

  next: () => {
    const { currentIndex, broadcasts } = get();
    if (broadcasts.length === 0) return;
    const nextIndex = (currentIndex + 1) % broadcasts.length;
    get().play(nextIndex);
  },

  prev: () => {
    const { currentIndex, broadcasts } = get();
    if (broadcasts.length === 0) return;
    const prevIndex = (currentIndex - 1 + broadcasts.length) % broadcasts.length;
    get().play(prevIndex);
  },

  seek: (time: number) => {
    set({ currentTime: Math.max(0, time) });
  },

  setCurrentTime: (time: number) => {
    set({ currentTime: time });
  },

  setDuration: (duration: number) => {
    set({ duration });
  },

  recordPlayback: async (broadcastId: string, playDuration: number, completed: boolean) => {
    try {
      await fetchApi('/api/v1/radio/play-record', {
        method: 'POST',
        body: {
          broadcast_id: broadcastId,
          play_duration: playDuration,
          completed,
        },
      });
    } catch {
      // 播放记录失败不影响用户体验
    }
  },

  reset: () => {
    set({
      broadcasts: [],
      categories: [],
      currentIndex: 0,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      loading: false,
      error: null,
    });
  },
}));

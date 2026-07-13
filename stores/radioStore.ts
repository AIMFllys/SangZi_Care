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

const PLAYBACK_ERROR = '广播音频播放失败，请稍后重试';

let activeAudio: HTMLAudioElement | null = null;
let activeBroadcastId: string | null = null;
let activeAudioUrl: string | null = null;
let activePlaybackEnded = false;
let activeWantsToPlay = false;
let playbackGeneration = 0;
let playAttemptGeneration = 0;
let detachActiveListeners: (() => void) | null = null;

function releaseActiveAudio(): void {
  playbackGeneration += 1;
  playAttemptGeneration += 1;
  const audio = activeAudio;
  activeAudio = null;
  activeBroadcastId = null;
  activeAudioUrl = null;
  activePlaybackEnded = false;
  activeWantsToPlay = false;
  detachActiveListeners?.();
  detachActiveListeners = null;

  if (!audio) return;
  try {
    audio.pause();
  } catch {
    // 已损坏的媒体实例仍需继续释放 src。
  }
  try {
    audio.removeAttribute('src');
    audio.load();
  } catch {
    // 某些 WebView 在销毁阶段可能拒绝 load；状态已经失效，不再传播。
  }
}

function finiteNonNegative(value: number, fallback = 0): number {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
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

export const useRadioStore = create<RadioState>()((set, get) => {
  function attemptPlay(audio: HTMLAudioElement, generation: number): void {
    const attempt = ++playAttemptGeneration;
    activeWantsToPlay = true;
    const isCurrent = () => (
      activeAudio === audio
      && playbackGeneration === generation
      && playAttemptGeneration === attempt
    );

    set({ isPlaying: true, error: null });
    try {
      void audio.play().catch(() => {
        if (!isCurrent()) return;
        activeWantsToPlay = false;
        set({ isPlaying: false, error: PLAYBACK_ERROR });
      });
    } catch {
      if (isCurrent()) {
        activeWantsToPlay = false;
        set({ isPlaying: false, error: PLAYBACK_ERROR });
      }
    }
  }

  return {
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
      releaseActiveAudio();
      set({
        broadcasts: data,
        currentIndex: 0,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        loading: false,
      });
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
    const audioUrl = broadcast.audio_url?.trim() ?? '';

    if (!audioUrl) {
      releaseActiveAudio();
      set({
        currentIndex: index,
        isPlaying: false,
        currentTime: 0,
        duration: finiteNonNegative(broadcast.audio_duration ?? 0),
        error: '该广播暂无可播放音频',
      });
      return;
    }

    if (
      activeAudio
      && !activePlaybackEnded
      && activeBroadcastId === broadcast.id
      && activeAudioUrl === audioUrl
    ) {
      set({ currentIndex: index });
      attemptPlay(activeAudio, playbackGeneration);
      return;
    }

    releaseActiveAudio();
    const generation = ++playbackGeneration;
    let audio: HTMLAudioElement;
    try {
      audio = new Audio(audioUrl);
    } catch {
      set({
        currentIndex: index,
        isPlaying: false,
        currentTime: 0,
        duration: finiteNonNegative(broadcast.audio_duration ?? 0),
        error: PLAYBACK_ERROR,
      });
      return;
    }

    audio.preload = 'metadata';
    activeAudio = audio;
    activeBroadcastId = broadcast.id;
    activeAudioUrl = audioUrl;
    activePlaybackEnded = false;
    activeWantsToPlay = false;
    let playbackRecorded = false;
    const isCurrent = () => (
      activeAudio === audio && playbackGeneration === generation
    );

    const onPlay = () => {
      if (!isCurrent()) return;
      if (!activeWantsToPlay) {
        try {
          audio.pause();
        } catch {
          // 状态仍保持暂停；后续 reset 会继续释放实例。
        }
        set({ isPlaying: false });
        return;
      }
      set({ isPlaying: true, error: null });
    };
    const onPause = () => {
      if (!isCurrent()) return;
      activeWantsToPlay = false;
      playAttemptGeneration += 1;
      set({ isPlaying: false });
    };
    const onDuration = () => {
      if (!isCurrent()) return;
      const fallback = finiteNonNegative(broadcast.audio_duration ?? 0);
      set({ duration: finiteNonNegative(audio.duration, fallback) });
    };
    const onTimeUpdate = () => {
      if (!isCurrent()) return;
      const maxDuration = finiteNonNegative(
        audio.duration,
        finiteNonNegative(get().duration),
      );
      const currentTime = finiteNonNegative(audio.currentTime);
      set({
        currentTime: maxDuration > 0
          ? Math.min(currentTime, maxDuration)
          : currentTime,
      });
    };
    const onEnded = () => {
      if (!isCurrent() || playbackRecorded) return;
      playbackRecorded = true;
      activePlaybackEnded = true;
      activeWantsToPlay = false;
      playAttemptGeneration += 1;
      const completedDuration = finiteNonNegative(
        audio.duration,
        finiteNonNegative(get().duration),
      );
      set({
        isPlaying: false,
        currentTime: completedDuration,
        duration: completedDuration,
      });
      void get().recordPlayback(broadcast.id, completedDuration, true);
    };
    const onError = () => {
      if (!isCurrent()) return;
      activeWantsToPlay = false;
      playAttemptGeneration += 1;
      set({ isPlaying: false, error: PLAYBACK_ERROR });
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    detachActiveListeners = () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };

    set({
      currentIndex: index,
      isPlaying: true,
      currentTime: 0,
      duration: finiteNonNegative(broadcast.audio_duration ?? 0),
      error: null,
    });
    attemptPlay(audio, generation);
  },

  pause: () => {
    activeWantsToPlay = false;
    playAttemptGeneration += 1;
    try {
      activeAudio?.pause();
    } catch {
      // 即使媒体暂停抛错，也要同步 UI 为非播放态。
    }
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
    const requested = finiteNonNegative(time);
    const maxDuration = activeAudio
      ? finiteNonNegative(activeAudio.duration, finiteNonNegative(get().duration))
      : finiteNonNegative(get().duration);
    const target = maxDuration > 0
      ? Math.min(requested, maxDuration)
      : requested;
    if (activeAudio) {
      try {
        activeAudio.currentTime = target;
      } catch {
        set({ error: PLAYBACK_ERROR });
        return;
      }
    }
    set({ currentTime: target });
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
    releaseActiveAudio();
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
  };
});

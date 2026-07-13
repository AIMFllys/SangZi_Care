import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRadioStore, formatTime } from '../radioStore';
import type { BroadcastResponse } from '../radioStore';

// Mock fetchApi
vi.mock('@/lib/api', () => ({
  fetchApi: vi.fn(),
}));

import { fetchApi } from '@/lib/api';

const mockFetchApi = fetchApi as ReturnType<typeof vi.fn>;

type AudioListener = EventListenerOrEventListenerObject;

class FakeAudio {
  static instances: FakeAudio[] = [];
  static playBehavior: ((audio: FakeAudio) => Promise<void>) | null = null;

  src: string;
  preload = '';
  currentTime = 0;
  duration = Number.NaN;
  paused = true;
  private readonly listeners = new Map<string, Set<AudioListener>>();

  readonly play = vi.fn(() => {
    if (FakeAudio.playBehavior) return FakeAudio.playBehavior(this);
    this.paused = false;
    this.emit('play');
    return Promise.resolve();
  });

  readonly pause = vi.fn(() => {
    this.paused = true;
    this.emit('pause');
  });

  readonly load = vi.fn();

  readonly removeAttribute = vi.fn((name: string) => {
    if (name === 'src') this.src = '';
  });

  constructor(src = '') {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  addEventListener(type: string, listener: AudioListener): void {
    const listeners = this.listeners.get(type) ?? new Set<AudioListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: AudioListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    const event = new Event(type);
    for (const listener of this.listeners.get(type) ?? []) {
      if (typeof listener === 'function') listener.call(this, event);
      else listener.handleEvent(event);
    }
  }
}

// ---------- 辅助工厂 ----------

function makeBroadcast(
  overrides: Partial<BroadcastResponse> = {},
): BroadcastResponse {
  return {
    id: 'bc-1',
    title: '春季养生小贴士',
    content: '春天万物复苏，是养生的好时节...',
    category: '季节保健',
    audio_url: 'https://example.com/audio1.mp3',
    audio_duration: 180,
    play_count: 10,
    is_published: true,
    target_age_min: 60,
    target_age_max: 90,
    target_diseases: ['高血压'],
    target_season: '春',
    ai_prompt: null,
    generated_by: null,
    created_at: '2024-06-01T00:00:00Z',
    updated_at: null,
    ...overrides,
  };
}

// ---------- 纯函数测试 ----------

describe('formatTime', () => {
  it('0秒格式化为 00:00', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('65秒格式化为 01:05', () => {
    expect(formatTime(65)).toBe('01:05');
  });

  it('180秒格式化为 03:00', () => {
    expect(formatTime(180)).toBe('03:00');
  });

  it('小数秒取整', () => {
    expect(formatTime(65.7)).toBe('01:05');
  });

  it('负数返回 00:00', () => {
    expect(formatTime(-10)).toBe('00:00');
  });

  it('NaN 返回 00:00', () => {
    expect(formatTime(NaN)).toBe('00:00');
  });

  it('Infinity 返回 00:00', () => {
    expect(formatTime(Infinity)).toBe('00:00');
  });
});

// ---------- Store 测试 ----------

describe('useRadioStore', () => {
  beforeEach(() => {
    vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio);
    useRadioStore.getState().reset();
    vi.clearAllMocks();
    FakeAudio.instances = [];
    FakeAudio.playBehavior = null;
  });

  describe('初始状态', () => {
    it('默认值正确', () => {
      const state = useRadioStore.getState();
      expect(state.broadcasts).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.currentIndex).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchRecommendations', () => {
    it('成功拉取推荐广播', async () => {
      const broadcasts = [makeBroadcast(), makeBroadcast({ id: 'bc-2', title: '饮食健康' })];
      mockFetchApi.mockResolvedValue(broadcasts);

      await useRadioStore.getState().fetchRecommendations();

      const state = useRadioStore.getState();
      expect(state.broadcasts).toEqual(broadcasts);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/radio/recommend');
    });

    it('拉取失败设置错误信息', async () => {
      mockFetchApi.mockRejectedValue(new Error('网络错误'));

      await useRadioStore.getState().fetchRecommendations();

      const state = useRadioStore.getState();
      expect(state.error).toBe('网络错误');
      expect(state.loading).toBe(false);
    });
  });

  describe('fetchCategories', () => {
    it('成功拉取分类', async () => {
      const categories = [
        { key: 'diet', name: '饮食营养', description: '健康饮食' },
        { key: 'exercise', name: '运动养生', description: '适度运动' },
      ];
      mockFetchApi.mockResolvedValue(categories);

      await useRadioStore.getState().fetchCategories();

      const state = useRadioStore.getState();
      expect(state.categories).toEqual(categories);
    });

    it('拉取失败设置错误信息', async () => {
      mockFetchApi.mockRejectedValue(new Error('分类加载失败'));

      await useRadioStore.getState().fetchCategories();

      expect(useRadioStore.getState().error).toBe('分类加载失败');
    });
  });

  describe('play', () => {
    it('使用推荐接口返回的短期 URL 创建真实 Audio 并播放', () => {
      const broadcast = makeBroadcast({
        audio_url: 'https://storage.test/signed.mp3?token=short-lived',
      });
      useRadioStore.setState({ broadcasts: [broadcast] });

      useRadioStore.getState().play(0);

      expect(FakeAudio.instances).toHaveLength(1);
      expect(FakeAudio.instances[0].src).toBe(broadcast.audio_url);
      expect(FakeAudio.instances[0].play).toHaveBeenCalledOnce();
      expect(useRadioStore.getState().isPlaying).toBe(true);
    });

    it('同一条广播暂停后继续播放时复用 Audio 和当前位置', () => {
      useRadioStore.setState({ broadcasts: [makeBroadcast()] });

      useRadioStore.getState().play(0);
      useRadioStore.getState().seek(42);
      useRadioStore.getState().pause();
      useRadioStore.getState().play(0);

      expect(FakeAudio.instances).toHaveLength(1);
      expect(FakeAudio.instances[0].play).toHaveBeenCalledTimes(2);
      expect(FakeAudio.instances[0].currentTime).toBe(42);
      expect(useRadioStore.getState().currentTime).toBe(42);
    });

    it('没有音频 URL 时不伪装播放成功', () => {
      useRadioStore.setState({
        broadcasts: [makeBroadcast({ audio_url: null })],
      });

      useRadioStore.getState().play(0);

      expect(FakeAudio.instances).toHaveLength(0);
      expect(useRadioStore.getState()).toMatchObject({
        isPlaying: false,
        error: '该广播暂无可播放音频',
      });
    });

    it('当前 Audio 的 play 拒绝时回滚播放状态并显示安全错误', async () => {
      FakeAudio.playBehavior = () => Promise.reject(new Error('private details'));
      useRadioStore.setState({ broadcasts: [makeBroadcast()] });

      useRadioStore.getState().play(0);
      await Promise.resolve();
      await Promise.resolve();

      expect(useRadioStore.getState()).toMatchObject({
        isPlaying: false,
        error: '广播音频播放失败，请稍后重试',
      });
    });

    it('同一 Audio 后一次播放成功后忽略前一次迟到的 play 拒绝', async () => {
      let rejectFirst: ((reason?: unknown) => void) | undefined;
      let attempts = 0;
      FakeAudio.playBehavior = (audio) => {
        attempts += 1;
        if (attempts === 1) {
          return new Promise<void>((_resolve, reject) => {
            rejectFirst = reject;
          });
        }
        audio.paused = false;
        audio.emit('play');
        return Promise.resolve();
      };
      useRadioStore.setState({ broadcasts: [makeBroadcast()] });

      useRadioStore.getState().play(0);
      useRadioStore.getState().play(0);
      rejectFirst?.(new Error('late first rejection'));
      await Promise.resolve();
      await Promise.resolve();

      expect(FakeAudio.instances).toHaveLength(1);
      expect(useRadioStore.getState()).toMatchObject({
        isPlaying: true,
        error: null,
      });
    });

    it('播放指定索引的广播', () => {
      const broadcasts = [
        makeBroadcast({ id: 'bc-1', audio_duration: 120 }),
        makeBroadcast({ id: 'bc-2', audio_duration: 200 }),
      ];
      useRadioStore.setState({ broadcasts });

      useRadioStore.getState().play(1);

      const state = useRadioStore.getState();
      expect(state.currentIndex).toBe(1);
      expect(state.isPlaying).toBe(true);
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(200);
    });

    it('无效索引不执行操作', () => {
      useRadioStore.setState({ broadcasts: [makeBroadcast()] });

      useRadioStore.getState().play(5);

      expect(useRadioStore.getState().isPlaying).toBe(false);
    });

    it('负数索引不执行操作', () => {
      useRadioStore.setState({ broadcasts: [makeBroadcast()] });

      useRadioStore.getState().play(-1);

      expect(useRadioStore.getState().isPlaying).toBe(false);
    });

    it('audio_duration 为 null 时 duration 设为 0', () => {
      useRadioStore.setState({
        broadcasts: [makeBroadcast({ audio_duration: null })],
      });

      useRadioStore.getState().play(0);

      expect(useRadioStore.getState().duration).toBe(0);
    });
  });

  describe('pause', () => {
    it('暂停当前真实 Audio', () => {
      useRadioStore.setState({ broadcasts: [makeBroadcast()] });
      useRadioStore.getState().play(0);
      const audio = FakeAudio.instances[0];

      useRadioStore.getState().pause();

      expect(audio.pause).toHaveBeenCalledOnce();
      expect(useRadioStore.getState().isPlaying).toBe(false);
    });

    it('暂停后忽略迟到 play 事件并再次压停真实音频', () => {
      FakeAudio.playBehavior = () => new Promise<void>(() => undefined);
      useRadioStore.setState({ broadcasts: [makeBroadcast()] });
      useRadioStore.getState().play(0);
      const audio = FakeAudio.instances[0];

      useRadioStore.getState().pause();
      audio.emit('play');

      expect(audio.pause).toHaveBeenCalledTimes(2);
      expect(useRadioStore.getState().isPlaying).toBe(false);
    });

    it('暂停播放', () => {
      useRadioStore.setState({ isPlaying: true });

      useRadioStore.getState().pause();

      expect(useRadioStore.getState().isPlaying).toBe(false);
    });
  });

  describe('next', () => {
    it('切换到下一条', () => {
      const broadcasts = [
        makeBroadcast({ id: 'bc-1' }),
        makeBroadcast({ id: 'bc-2' }),
      ];
      useRadioStore.setState({ broadcasts, currentIndex: 0 });

      useRadioStore.getState().next();

      expect(useRadioStore.getState().currentIndex).toBe(1);
      expect(useRadioStore.getState().isPlaying).toBe(true);
    });

    it('最后一条循环到第一条', () => {
      const broadcasts = [
        makeBroadcast({ id: 'bc-1' }),
        makeBroadcast({ id: 'bc-2' }),
      ];
      useRadioStore.setState({ broadcasts, currentIndex: 1 });

      useRadioStore.getState().next();

      expect(useRadioStore.getState().currentIndex).toBe(0);
    });

    it('空列表不执行操作', () => {
      useRadioStore.setState({ broadcasts: [], currentIndex: 0 });

      useRadioStore.getState().next();

      expect(useRadioStore.getState().currentIndex).toBe(0);
    });
  });

  describe('prev', () => {
    it('切换到上一条', () => {
      const broadcasts = [
        makeBroadcast({ id: 'bc-1' }),
        makeBroadcast({ id: 'bc-2' }),
      ];
      useRadioStore.setState({ broadcasts, currentIndex: 1 });

      useRadioStore.getState().prev();

      expect(useRadioStore.getState().currentIndex).toBe(0);
      expect(useRadioStore.getState().isPlaying).toBe(true);
    });

    it('第一条循环到最后一条', () => {
      const broadcasts = [
        makeBroadcast({ id: 'bc-1' }),
        makeBroadcast({ id: 'bc-2' }),
      ];
      useRadioStore.setState({ broadcasts, currentIndex: 0 });

      useRadioStore.getState().prev();

      expect(useRadioStore.getState().currentIndex).toBe(1);
    });

    it('空列表不执行操作', () => {
      useRadioStore.setState({ broadcasts: [], currentIndex: 0 });

      useRadioStore.getState().prev();

      expect(useRadioStore.getState().currentIndex).toBe(0);
    });
  });

  describe('seek', () => {
    it('同步真实 Audio 的 currentTime，并按时长夹取', () => {
      useRadioStore.setState({ broadcasts: [makeBroadcast()] });
      useRadioStore.getState().play(0);
      const audio = FakeAudio.instances[0];
      audio.duration = 120;
      audio.emit('loadedmetadata');

      useRadioStore.getState().seek(150);

      expect(audio.currentTime).toBe(120);
      expect(useRadioStore.getState().currentTime).toBe(120);
      useRadioStore.getState().seek(-1);
      expect(audio.currentTime).toBe(0);
    });

    it('跳转到指定时间', () => {
      useRadioStore.getState().seek(30);
      expect(useRadioStore.getState().currentTime).toBe(30);
    });

    it('负数时间归零', () => {
      useRadioStore.getState().seek(-5);
      expect(useRadioStore.getState().currentTime).toBe(0);
    });
  });

  describe('recordPlayback', () => {
    it('当前音频结束时只记录一次完整播放', () => {
      mockFetchApi.mockResolvedValue({});
      useRadioStore.setState({ broadcasts: [makeBroadcast({ audio_duration: 90 })] });
      useRadioStore.getState().play(0);
      const audio = FakeAudio.instances[0];
      audio.duration = 90;

      audio.emit('ended');
      audio.emit('ended');

      expect(useRadioStore.getState()).toMatchObject({
        isPlaying: false,
        currentTime: 90,
      });
      expect(mockFetchApi).toHaveBeenCalledTimes(1);
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/radio/play-record', {
        method: 'POST',
        body: {
          broadcast_id: 'bc-1',
          play_duration: 90,
          completed: true,
        },
      });
    });

    it('成功记录播放历史', async () => {
      mockFetchApi.mockResolvedValue({});

      await useRadioStore.getState().recordPlayback('bc-1', 120, true);

      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/radio/play-record', {
        method: 'POST',
        body: {
          broadcast_id: 'bc-1',
          play_duration: 120,
          completed: true,
        },
      });
    });

    it('记录失败不抛出错误', async () => {
      mockFetchApi.mockRejectedValue(new Error('记录失败'));

      // 不应抛出
      await expect(
        useRadioStore.getState().recordPlayback('bc-1', 60, false),
      ).resolves.toBeUndefined();
    });
  });

  describe('reset', () => {
    it('停止并释放 Audio，且忽略释放后的迟到事件', () => {
      useRadioStore.setState({ broadcasts: [makeBroadcast()] });
      useRadioStore.getState().play(0);
      const audio = FakeAudio.instances[0];

      useRadioStore.getState().reset();
      audio.currentTime = 88;
      audio.emit('timeupdate');
      audio.emit('ended');
      audio.emit('error');

      expect(audio.pause).toHaveBeenCalledOnce();
      expect(audio.removeAttribute).toHaveBeenCalledWith('src');
      expect(audio.load).toHaveBeenCalledOnce();
      expect(useRadioStore.getState()).toMatchObject({
        broadcasts: [],
        isPlaying: false,
        currentTime: 0,
        error: null,
      });
    });

    it('切换后忽略旧 Audio 的 ended、error、timeupdate 和迟到 play 拒绝', async () => {
      let rejectOldPlay: ((reason?: unknown) => void) | undefined;
      FakeAudio.playBehavior = (audio) => {
        if (FakeAudio.instances.indexOf(audio) === 0) {
          return new Promise<void>((_resolve, reject) => {
            rejectOldPlay = reject;
          });
        }
        audio.paused = false;
        audio.emit('play');
        return Promise.resolve();
      };
      useRadioStore.setState({
        broadcasts: [
          makeBroadcast({ id: 'old' }),
          makeBroadcast({ id: 'current', audio_url: 'https://example.com/current.mp3' }),
        ],
      });

      useRadioStore.getState().play(0);
      const oldAudio = FakeAudio.instances[0];
      useRadioStore.getState().play(1);
      oldAudio.currentTime = 77;
      oldAudio.emit('timeupdate');
      oldAudio.emit('ended');
      oldAudio.emit('error');
      rejectOldPlay?.(new Error('late rejection'));
      await Promise.resolve();
      await Promise.resolve();

      expect(useRadioStore.getState()).toMatchObject({
        currentIndex: 1,
        isPlaying: true,
        currentTime: 0,
        error: null,
      });
      expect(mockFetchApi).not.toHaveBeenCalledWith(
        '/api/v1/radio/play-record',
        expect.anything(),
      );
    });

    it('重置所有状态', () => {
      useRadioStore.setState({
        broadcasts: [makeBroadcast()],
        categories: [{ key: 'diet', name: '饮食', description: '' }],
        currentIndex: 2,
        isPlaying: true,
        currentTime: 45,
        duration: 180,
        error: '错误',
      });

      useRadioStore.getState().reset();

      const state = useRadioStore.getState();
      expect(state.broadcasts).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.currentIndex).toBe(0);
      expect(state.isPlaying).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.error).toBeNull();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------- Mock HTMLMediaElement ----------

beforeEach(() => {
  // jsdom 不实现 HTMLMediaElement 方法，需要 mock
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
  window.HTMLMediaElement.prototype.load = vi.fn();
});

// ---------- Mock 依赖 ----------

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockPlay = vi.fn();
const mockPause = vi.fn();
const mockNext = vi.fn();
const mockPrev = vi.fn();
const mockSeek = vi.fn();
const mockFetchRecommendations = vi.fn();
const mockFetchCategories = vi.fn();
const mockRecordPlayback = vi.fn();
const mockSetCurrentTime = vi.fn();
const mockSetDuration = vi.fn();

let mockStoreState = {
  broadcasts: [] as import('@/stores/radioStore').BroadcastResponse[],
  categories: [] as import('@/stores/radioStore').CategoryInfo[],
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  loading: false,
  error: null as string | null,
  fetchRecommendations: mockFetchRecommendations,
  fetchCategories: mockFetchCategories,
  play: mockPlay,
  pause: mockPause,
  next: mockNext,
  prev: mockPrev,
  seek: mockSeek,
  setCurrentTime: mockSetCurrentTime,
  setDuration: mockSetDuration,
  recordPlayback: mockRecordPlayback,
  reset: vi.fn(),
};

vi.mock('@/stores/radioStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/radioStore')>();
  return {
    ...actual,
    useRadioStore: (selector?: (s: typeof mockStoreState) => unknown) => {
      if (selector) return selector(mockStoreState);
      return mockStoreState;
    },
  };
});

// 动态导入组件（在 mock 之后）
const { default: RadioPage } = await import('../page');

// ---------- 辅助工厂 ----------

function makeBroadcast(
  overrides: Partial<import('@/stores/radioStore').BroadcastResponse> = {},
): import('@/stores/radioStore').BroadcastResponse {
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

function resetMockState() {
  mockStoreState = {
    broadcasts: [],
    categories: [],
    currentIndex: 0,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    loading: false,
    error: null,
    fetchRecommendations: mockFetchRecommendations,
    fetchCategories: mockFetchCategories,
    play: mockPlay,
    pause: mockPause,
    next: mockNext,
    prev: mockPrev,
    seek: mockSeek,
    setCurrentTime: mockSetCurrentTime,
    setDuration: mockSetDuration,
    recordPlayback: mockRecordPlayback,
    reset: vi.fn(),
  };
}

// ---------- 测试 ----------

describe('RadioPage 组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockState();
  });

  it('渲染页面标题', () => {
    render(<RadioPage />);
    expect(screen.getByText(/健康广播/)).toBeDefined();
  });

  it('返回按钮导航到首页', () => {
    render(<RadioPage />);
    fireEvent.click(screen.getByLabelText('返回首页'));
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('加载状态显示加载文字', () => {
    mockStoreState.loading = true;
    render(<RadioPage />);
    expect(screen.getByText('加载中...')).toBeDefined();
  });

  it('错误状态显示错误信息和重试按钮', () => {
    mockStoreState.error = '网络错误';
    render(<RadioPage />);
    expect(screen.getByText('网络错误')).toBeDefined();
    expect(screen.getByText('重试')).toBeDefined();
  });

  it('点击重试按钮重新加载', () => {
    mockStoreState.error = '网络错误';
    render(<RadioPage />);
    fireEvent.click(screen.getByText('重试'));
    expect(mockFetchRecommendations).toHaveBeenCalled();
    expect(mockFetchCategories).toHaveBeenCalled();
  });

  it('空列表显示空状态', () => {
    render(<RadioPage />);
    expect(screen.getByText('暂无推荐广播')).toBeDefined();
  });

  it('有广播时显示播放控制按钮', () => {
    mockStoreState.broadcasts = [makeBroadcast()];
    render(<RadioPage />);
    expect(screen.getByLabelText('上一条')).toBeDefined();
    expect(screen.getByLabelText('播放')).toBeDefined();
    expect(screen.getByLabelText('下一条')).toBeDefined();
  });

  it('播放中显示暂停按钮', () => {
    mockStoreState.broadcasts = [makeBroadcast()];
    mockStoreState.isPlaying = true;
    render(<RadioPage />);
    expect(screen.getByLabelText('暂停')).toBeDefined();
  });

  it('显示当前广播标题', () => {
    mockStoreState.broadcasts = [makeBroadcast()];
    render(<RadioPage />);
    // 标题同时出现在播放卡片和列表中，使用 getAllByText
    const titles = screen.getAllByText('春季养生小贴士');
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it('显示当前广播分类', () => {
    mockStoreState.broadcasts = [makeBroadcast()];
    render(<RadioPage />);
    const categories = screen.getAllByText('季节保健');
    expect(categories.length).toBeGreaterThanOrEqual(1);
  });

  it('显示推荐收听列表标题', () => {
    mockStoreState.broadcasts = [
      makeBroadcast({ id: 'bc-1', title: '广播一' }),
      makeBroadcast({ id: 'bc-2', title: '广播二' }),
    ];
    render(<RadioPage />);
    expect(screen.getByText('📋 推荐收听')).toBeDefined();
  });

  it('显示多条广播在推荐列表中', () => {
    mockStoreState.broadcasts = [
      makeBroadcast({ id: 'bc-1', title: '广播一' }),
      makeBroadcast({ id: 'bc-2', title: '广播二' }),
    ];
    render(<RadioPage />);
    // 广播一同时出现在播放卡片和列表中
    expect(screen.getAllByText('广播一').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('广播二')).toBeDefined();
  });

  it('显示进度条当前时间', () => {
    mockStoreState.broadcasts = [makeBroadcast()];
    mockStoreState.currentTime = 65;
    mockStoreState.duration = 180;
    render(<RadioPage />);
    expect(screen.getByText('01:05')).toBeDefined();
  });

  it('显示分类标签', () => {
    mockStoreState.broadcasts = [makeBroadcast()];
    mockStoreState.categories = [
      { key: 'diet', name: '饮食营养', description: '' },
      { key: 'exercise', name: '运动养生', description: '' },
    ];
    render(<RadioPage />);
    expect(screen.getByText('饮食营养')).toBeDefined();
    expect(screen.getByText('运动养生')).toBeDefined();
  });

  it('点击下一条按钮调用 next', () => {
    mockStoreState.broadcasts = [makeBroadcast()];
    render(<RadioPage />);
    fireEvent.click(screen.getByLabelText('下一条'));
    expect(mockNext).toHaveBeenCalled();
  });

  it('点击上一条按钮调用 prev', () => {
    mockStoreState.broadcasts = [makeBroadcast()];
    render(<RadioPage />);
    fireEvent.click(screen.getByLabelText('上一条'));
    expect(mockPrev).toHaveBeenCalled();
  });

  it('正在播放标签显示', () => {
    mockStoreState.broadcasts = [makeBroadcast()];
    render(<RadioPage />);
    expect(screen.getByText('正在播放')).toBeDefined();
  });
});

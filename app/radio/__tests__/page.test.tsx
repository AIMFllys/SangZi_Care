import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ---------- Mock HTMLMediaElement ----------

beforeEach(() => {
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
  window.HTMLMediaElement.prototype.load = vi.fn();
});

// ---------- Mock 依赖 ----------

const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
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

  it('返回按钮导航到上一页', () => {
    render(<RadioPage />);
    fireEvent.click(screen.getByLabelText('返回首页'));
    expect(mockBack).toHaveBeenCalled();
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
    expect(screen.getByText('重新加载')).toBeDefined();
  });

  it('点击重试按钮重新加载', () => {
    mockStoreState.error = '网络错误';
    render(<RadioPage />);
    fireEvent.click(screen.getByText('重新加载'));
    expect(mockFetchRecommendations).toHaveBeenCalled();
  });

  it('空列表显示空状态', () => {
    render(<RadioPage />);
    expect(screen.getByText('暂无推荐')).toBeDefined();
  });

  it('有广播时显示推荐列表', () => {
    mockStoreState.broadcasts = [makeBroadcast()];
    render(<RadioPage />);
    expect(screen.getByText('春季养生小贴士')).toBeDefined();
    expect(screen.getByText(/季节保健/)).toBeDefined();
    expect(screen.getByLabelText('播放春季养生小贴士')).toBeDefined();
  });

  it('已有列表时播放错误以内联提示呈现，不把所有节目替换成加载失败页', () => {
    mockStoreState.broadcasts = [makeBroadcast()];
    mockStoreState.error = '广播音频播放失败，请稍后重试';

    render(<RadioPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('广播音频播放失败');
    expect(screen.getByText('春季养生小贴士')).toBeInTheDocument();
    expect(screen.queryByText('重新加载')).not.toBeInTheDocument();
  });

  it('搜索框有可访问名称并可提交筛选', () => {
    mockStoreState.broadcasts = [
      makeBroadcast({ id: 'health', title: '春季养生小贴士' }),
      makeBroadcast({ id: 'news', title: '今日新闻速递', category: '每日新闻' }),
    ];
    render(<RadioPage />);

    fireEvent.change(screen.getByRole('searchbox', { name: '搜索广播' }), {
      target: { value: '新闻' },
    });
    fireEvent.click(screen.getByRole('button', { name: '搜索广播' }));

    expect(screen.queryByText('春季养生小贴士')).toBeNull();
    expect(screen.getByText('今日新闻速递')).toBeDefined();
  });

  it('分类是按钮且播放控件调用广播状态', () => {
    mockStoreState.broadcasts = [makeBroadcast()];
    render(<RadioPage />);

    fireEvent.click(screen.getByRole('button', { name: '播放春季养生小贴士' }));
    expect(mockPlay).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole('button', { name: '养生常识' }));
    expect(mockFetchRecommendations).toHaveBeenCalled();
  });

  it('没有签名音频 URL 时禁用播放按钮', () => {
    mockStoreState.broadcasts = [makeBroadcast({ audio_url: null })];
    render(<RadioPage />);

    const button = screen.getByRole('button', {
      name: '春季养生小贴士暂无可播放音频',
    });
    expect(button).toHaveProperty('disabled', true);
    fireEvent.click(button);
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('卸载页面时重置播放器，防止音频继续播放', () => {
    const { unmount } = render(<RadioPage />);

    unmount();

    expect(mockStoreState.reset).toHaveBeenCalledOnce();
  });

  it('播放中显示底部播放器', () => {
    mockStoreState.broadcasts = [makeBroadcast()];
    mockStoreState.isPlaying = true;
    render(<RadioPage />);
    expect(screen.getByLabelText('暂停')).toBeDefined();
    expect(screen.getAllByText('春季养生小贴士').length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByLabelText('暂停'));
    expect(mockPause).toHaveBeenCalled();
  });

  it('显示热门分类', () => {
    render(<RadioPage />);
    expect(screen.getByText('京剧名段')).toBeDefined();
    expect(screen.getByText('养生常识')).toBeDefined();
    expect(screen.getByText('每日新闻')).toBeDefined();
    expect(screen.getByText('评书大全')).toBeDefined();
  });
});

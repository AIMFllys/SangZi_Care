import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ---------- Mock 依赖 ----------

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/settings/accessibility',
}));

const mockSetUser = vi.fn();
let mockUser: Record<string, unknown> | null = {
  id: 'u1',
  name: '张三',
  phone: '13800138000',
  role: 'elder',
  font_size: 'normal',
  voice_speed: 0.8,
  birth_date: null,
  gender: null,
  chronic_diseases: null,
  avatar_url: null,
  wake_word: null,
  last_active_at: null,
  created_at: null,
  updated_at: null,
};

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (s: Record<string, unknown>) => unknown) => {
    const state = {
      user: mockUser,
      isElder: true,
      token: 'test-token',
      setUser: mockSetUser,
      setRole: vi.fn(),
      logout: vi.fn(),
      initialize: vi.fn().mockResolvedValue(true),
    };
    return selector(state);
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ isReady: true, isAuthenticated: true }),
}));

let mockFetchApi = vi.fn();
vi.mock('@/lib/api', () => ({
  fetchApi: (...args: unknown[]) => mockFetchApi(...args),
}));

const { default: AccessibilityPage, FONT_SIZE_OPTIONS, applyFontSize } = await import(
  '../accessibility/page'
);

// ---------- 测试 ----------

describe('AccessibilityPage 无障碍设置页', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 'u1',
      name: '张三',
      phone: '13800138000',
      role: 'elder',
      font_size: 'normal',
      voice_speed: 0.8,
      birth_date: null,
      gender: null,
      chronic_diseases: null,
      avatar_url: null,
      wake_word: null,
      last_active_at: null,
      created_at: null,
      updated_at: null,
    };
    mockFetchApi = vi.fn();
  });

  it('渲染页面标题', () => {
    render(<AccessibilityPage />);
    expect(screen.getByText('无障碍设置')).toBeDefined();
  });

  it('返回按钮导航到设置页', () => {
    render(<AccessibilityPage />);
    fireEvent.click(screen.getByLabelText('返回设置'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('显示三个字体大小选项', () => {
    render(<AccessibilityPage />);
    expect(screen.getByText('标准')).toBeDefined();
    expect(screen.getByText('大字')).toBeDefined();
    expect(screen.getByText('特大')).toBeDefined();
  });

  it('默认选中标准字体', () => {
    render(<AccessibilityPage />);
    const normalBtn = screen.getByRole('radio', { name: '标准' });
    expect(normalBtn.getAttribute('aria-checked')).toBe('true');
  });

  it('切换字体大小选项', () => {
    render(<AccessibilityPage />);
    const largeBtn = screen.getByRole('radio', { name: '大字' });
    fireEvent.click(largeBtn);
    expect(largeBtn.getAttribute('aria-checked')).toBe('true');
  });

  it('显示字体预览文字', () => {
    render(<AccessibilityPage />);
    expect(screen.getByText(/桑梓智护/)).toBeDefined();
  });

  it('显示语音速度滑块', () => {
    render(<AccessibilityPage />);
    const slider = screen.getByLabelText('语音速度') as HTMLInputElement;
    expect(slider).toBeDefined();
    expect(slider.value).toBe('0.8');
  });

  it('调整语音速度', () => {
    render(<AccessibilityPage />);
    const slider = screen.getByLabelText('语音速度') as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '1.2' } });
    expect(screen.getByText('1.2x')).toBeDefined();
  });

  it('保存成功调用 API 并显示成功提示', async () => {
    const updatedUser = { ...mockUser, font_size: 'large', voice_speed: 1.0 };
    mockFetchApi.mockResolvedValueOnce(updatedUser);
    render(<AccessibilityPage />);

    // 切换到大字
    fireEvent.click(screen.getByRole('radio', { name: '大字' }));
    // 调整语音速度
    fireEvent.change(screen.getByLabelText('语音速度'), { target: { value: '1.0' } });
    // 保存
    fireEvent.click(screen.getByText('保存设置'));

    await waitFor(() => {
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/users/me', {
        method: 'PATCH',
        body: { font_size: 'large', voice_speed: 1.0 },
      });
    });
    await waitFor(() => {
      expect(screen.getByText('保存成功')).toBeDefined();
    });
  });

  it('保存失败显示错误提示', async () => {
    mockFetchApi.mockRejectedValueOnce(new Error('保存失败'));
    render(<AccessibilityPage />);
    fireEvent.click(screen.getByText('保存设置'));

    await waitFor(() => {
      expect(screen.getByText('保存失败')).toBeDefined();
    });
  });

  it('用户有大字设置时预选大字', () => {
    mockUser = { ...mockUser!, font_size: 'large' };
    render(<AccessibilityPage />);
    const largeBtn = screen.getByRole('radio', { name: '大字' });
    expect(largeBtn.getAttribute('aria-checked')).toBe('true');
  });

  it('用户有自定义语音速度时预填充', () => {
    mockUser = { ...mockUser!, voice_speed: 1.2 };
    render(<AccessibilityPage />);
    expect(screen.getByText('1.2x')).toBeDefined();
  });
});

describe('applyFontSize 工具函数', () => {
  it('应用 normal 字体大小', () => {
    applyFontSize('normal');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--font-size-base')).toBe('16px');
  });

  it('应用 large 字体大小', () => {
    applyFontSize('large');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--font-size-base')).toBe('20px');
  });

  it('应用 xlarge 字体大小', () => {
    applyFontSize('xlarge');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--font-size-base')).toBe('24px');
  });

  it('无效大小不报错', () => {
    expect(() => applyFontSize('invalid')).not.toThrow();
  });
});

describe('FONT_SIZE_OPTIONS 常量', () => {
  it('包含三个选项', () => {
    expect(FONT_SIZE_OPTIONS.length).toBe(3);
  });

  it('包含 normal, large, xlarge', () => {
    const keys = FONT_SIZE_OPTIONS.map((o) => o.key);
    expect(keys).toContain('normal');
    expect(keys).toContain('large');
    expect(keys).toContain('xlarge');
  });
});

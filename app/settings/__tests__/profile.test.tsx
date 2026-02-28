import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ---------- Mock 依赖 ----------

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/settings/profile',
}));

const mockSetUser = vi.fn();
let mockUser: Record<string, unknown> | null = {
  id: 'u1',
  name: '张三',
  phone: '13800138000',
  role: 'elder',
  birth_date: '1950-05-15',
  gender: '男',
  chronic_diseases: ['高血压', '糖尿病'],
  font_size: 'normal',
  voice_speed: 0.8,
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

const { default: ProfilePage } = await import('../profile/page');

// ---------- 测试 ----------

describe('ProfilePage 个人信息编辑页', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 'u1',
      name: '张三',
      phone: '13800138000',
      role: 'elder',
      birth_date: '1950-05-15',
      gender: '男',
      chronic_diseases: ['高血压', '糖尿病'],
      font_size: 'normal',
      voice_speed: 0.8,
      avatar_url: null,
      wake_word: null,
      last_active_at: null,
      created_at: null,
      updated_at: null,
    };
    mockFetchApi = vi.fn();
  });

  it('渲染页面标题', () => {
    render(<ProfilePage />);
    expect(screen.getByText('个人信息')).toBeDefined();
  });

  it('返回按钮导航到设置页', () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByLabelText('返回设置'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('预填充用户姓名', () => {
    render(<ProfilePage />);
    const input = screen.getByLabelText('姓名') as HTMLInputElement;
    expect(input.value).toBe('张三');
  });

  it('预填充出生日期', () => {
    render(<ProfilePage />);
    const input = screen.getByLabelText('出生日期') as HTMLInputElement;
    expect(input.value).toBe('1950-05-15');
  });

  it('预填充性别选择', () => {
    render(<ProfilePage />);
    const maleBtn = screen.getByRole('radio', { name: '男' });
    expect(maleBtn.getAttribute('aria-checked')).toBe('true');
  });

  it('显示已有慢性病标签', () => {
    render(<ProfilePage />);
    expect(screen.getByText('高血压')).toBeDefined();
    expect(screen.getByText('糖尿病')).toBeDefined();
  });

  it('添加慢性病', () => {
    render(<ProfilePage />);
    const input = screen.getByLabelText('添加慢性病') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '冠心病' } });
    fireEvent.click(screen.getByLabelText('添加'));
    expect(screen.getByText('冠心病')).toBeDefined();
  });

  it('移除慢性病', () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByLabelText('移除高血压'));
    expect(screen.queryByText('高血压')).toBeNull();
  });

  it('切换性别', () => {
    render(<ProfilePage />);
    const femaleBtn = screen.getByRole('radio', { name: '女' });
    fireEvent.click(femaleBtn);
    expect(femaleBtn.getAttribute('aria-checked')).toBe('true');
  });

  it('姓名为空时显示错误', async () => {
    render(<ProfilePage />);
    const input = screen.getByLabelText('姓名') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(screen.getByText('保存'));
    expect(screen.getByText('请输入姓名')).toBeDefined();
  });

  it('保存成功调用 API 并显示成功提示', async () => {
    const updatedUser = { ...mockUser, name: '李四' };
    mockFetchApi.mockResolvedValueOnce(updatedUser);
    render(<ProfilePage />);
    const input = screen.getByLabelText('姓名') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '李四' } });
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(mockFetchApi).toHaveBeenCalledWith('/api/v1/users/me', {
        method: 'PATCH',
        body: expect.objectContaining({ name: '李四' }),
      });
    });
    await waitFor(() => {
      expect(screen.getByText('保存成功')).toBeDefined();
    });
  });

  it('保存失败显示错误提示', async () => {
    mockFetchApi.mockRejectedValueOnce(new Error('网络错误'));
    render(<ProfilePage />);
    fireEvent.click(screen.getByText('保存'));

    await waitFor(() => {
      expect(screen.getByText('网络错误')).toBeDefined();
    });
  });

  it('不允许添加重复慢性病', () => {
    render(<ProfilePage />);
    const input = screen.getByLabelText('添加慢性病') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '高血压' } });
    fireEvent.click(screen.getByLabelText('添加'));
    // 仍然只有一个高血压标签
    const tags = screen.getAllByText('高血压');
    expect(tags.length).toBe(1);
  });

  it('Enter键添加慢性病', () => {
    render(<ProfilePage />);
    const input = screen.getByLabelText('添加慢性病') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '关节炎' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('关节炎')).toBeDefined();
  });
});

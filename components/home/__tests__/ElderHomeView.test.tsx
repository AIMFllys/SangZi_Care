import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ElderHomeView from '../ElderHomeView';

const push = vi.fn();
const fetchApi = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: { id: 'elder-1', name: '王奶奶', role: 'elder' } }),
}));

vi.mock('@/lib/api', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));

describe('ElderHomeView', () => {
  let visibilityState: DocumentVisibilityState;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchApi.mockResolvedValue({ id: 'emergency-1' });
    visibilityState = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('语音入口是原生按钮且不显示无效上滑提示', () => {
    render(<ElderHomeView />);

    const voiceButton = screen.getByRole('button', { name: '点我说话，开启语音助手' });
    expect(voiceButton.tagName).toBe('BUTTON');
    expect(screen.queryByText('上滑更多功能')).not.toBeInTheDocument();

    fireEvent.click(voiceButton);
    expect(push).toHaveBeenCalledWith('/voice');
  });

  it('SOS 直接调用紧急呼叫接口并反馈结果', async () => {
    render(<ElderHomeView />);
    fireEvent.click(screen.getByRole('button', { name: '紧急呼叫 SOS' }));

    await waitFor(() => {
      expect(fetchApi).toHaveBeenCalledWith('/api/v1/emergency/trigger', {
        method: 'POST',
        body: { trigger_method: 'button' },
      });
    });
    expect(screen.getByRole('status')).toHaveTextContent('已通知家属');
    expect(push).not.toHaveBeenCalledWith('/settings');
  });

  it('退到后台时暂停时钟，返回前台后立即校时', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 13, 10, 0, 0));
    render(<ElderHomeView />);
    expect(screen.getByText('10:00')).toBeInTheDocument();

    act(() => {
      visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(90_000);
    });
    expect(screen.getByText('10:00')).toBeInTheDocument();

    act(() => {
      visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(screen.getByText('10:01')).toBeInTheDocument();
  });
});

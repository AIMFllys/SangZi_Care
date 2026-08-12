import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MedicinePage from '../page';

const fetchTodayTimeline = vi.fn();
const fetchAllPlans = vi.fn();
const confirmMedication = vi.fn().mockResolvedValue(undefined);
const fetchApi = vi.fn().mockResolvedValue({
  id: 'emergency-1', notification_status: 'sent', recipient_count: 1, replayed: false,
});
const push = vi.fn();
const speak = vi.fn().mockResolvedValue(undefined);
const stop = vi.fn();

function makeTimeline(now = Date.now()) {
  return [
    {
      plan: {
        id: 'plan-1',
        medicine_name: '降压药',
        dosage: '1片',
        remind_enabled: true,
        remind_before_minutes: 0,
      },
      scheduled_time: '08:00',
      scheduled_at: new Date(now - 60_000).toISOString(),
      status: 'pending' as const,
    },
    {
      plan: {
        id: 'plan-2',
        medicine_name: '维生素',
        dosage: '1粒',
        remind_enabled: true,
        remind_before_minutes: 0,
      },
      scheduled_time: '12:00',
      scheduled_at: new Date(now - 30_000).toISOString(),
      status: 'pending' as const,
    },
  ];
}

let timelineState = makeTimeline();
let targetUserIdState = 'elder-1';
let timelineTargetKeyState = 'elder-1';
let plansTargetKeyState = 'elder-1';
let isSelfState = true;
let isFamilyState = false;

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/stores/userStore', () => ({
  useUserStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: { id: 'elder-1', role: 'elder' } }),
}));
vi.mock('@/hooks/useCareRecipient', () => ({
  useCareRecipient: () => ({
    recipient: {
      id: 'elder-1',
      name: '李奶奶',
      permissions: {
        canEditMedication: true,
      },
    },
    recipients: [],
    targetUserId: targetUserIdState,
    isSelf: isSelfState,
    isFamily: isFamilyState,
    isLoading: false,
    selectRecipient: vi.fn(),
  }),
}));
vi.mock('@/stores/medicineStore', () => ({
  useMedicineStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      todayTimeline: timelineState,
      plans: [],
      timelineTargetKey: timelineTargetKeyState,
      plansTargetKey: plansTargetKeyState,
      isLoading: false,
      error: null,
      fetchTodayTimeline,
      fetchAllPlans,
      confirmMedication,
    }),
}));
vi.mock('@/lib/api', () => ({ fetchApi: (...args: unknown[]) => fetchApi(...args) }));
vi.mock('@/hooks/useTextToSpeech', () => ({
  useTextToSpeech: () => ({
    isSpeaking: false,
    error: null,
    currentLevel: 'mimo',
    speak,
    stop,
    setSpeed: vi.fn(),
  }),
}));

describe('MedicinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    timelineState = makeTimeline();
    targetUserIdState = 'elder-1';
    timelineTargetKeyState = 'elder-1';
    plansTargetKeyState = 'elder-1';
    isSelfState = true;
    isFamilyState = false;
    confirmMedication.mockResolvedValue(undefined);
    speak.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('真实提醒页只为同一稳定提醒播报一次 MiMo TTS', async () => {
    const view = render(<MedicinePage />);

    await waitFor(() => {
      expect(speak).toHaveBeenCalledWith('现在该吃药了。降压药 1片');
    });

    view.rerender(<MedicinePage />);
    await act(async () => Promise.resolve());
    expect(speak).toHaveBeenCalledTimes(1);
  });

  it('提醒键变化时停止旧播报并为下一种药播报一次', async () => {
    const view = render(<MedicinePage />);
    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1));

    timelineState = [timelineState[1]];
    view.rerender(<MedicinePage />);

    await waitFor(() => {
      expect(stop).toHaveBeenCalled();
      expect(speak).toHaveBeenNthCalledWith(2, '现在该吃药了。维生素 1粒');
    });
  });

  it('确认与延后都会先停止播报，卸载也清理音频', async () => {
    const confirmView = render(<MedicinePage />);
    await waitFor(() => expect(speak).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: '我已吃药' }));
    expect(stop.mock.invocationCallOrder.at(-1))
      .toBeLessThan(confirmMedication.mock.invocationCallOrder[0]);
    await waitFor(() => expect(confirmMedication).toHaveBeenCalled());
    confirmView.unmount();

    vi.clearAllMocks();
    const deferView = render(<MedicinePage />);
    await waitFor(() => expect(speak).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: '15分钟后再提醒' }));
    expect(stop).toHaveBeenCalled();
    deferView.unmount();
    expect(stop.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('提醒态只聚焦当前药物，延后当前项后不会压掉下一发生项', () => {
    render(<MedicinePage />);

    expect(screen.getByText('降压药')).toBeInTheDocument();
    expect(screen.queryByText('维生素')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '15分钟后再提醒' }));

    expect(screen.getByRole('heading', { name: '该吃药啦！' })).toBeInTheDocument();
    expect(screen.getByText('维生素')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '上一天' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '下一天' })).not.toBeInTheDocument();
  });

  it('延后 15 分钟到期后自动恢复同一发生项提醒', () => {
    vi.useFakeTimers();
    const now = new Date('2026-07-14T00:00:00.000Z');
    vi.setSystemTime(now);
    timelineState = [makeTimeline(now.getTime())[0]];

    render(<MedicinePage />);
    fireEvent.click(screen.getByRole('button', { name: '15分钟后再提醒' }));
    expect(screen.getByRole('heading', { name: '用药管家' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(15 * 60 * 1000);
    });

    expect(screen.getByRole('heading', { name: '该吃药啦！' })).toBeInTheDocument();
    expect(screen.getByText('降压药')).toBeInTheDocument();
  });

  it('未来用药到提醒阈值时无需重新渲染即可自动出现', () => {
    vi.useFakeTimers();
    const now = new Date('2026-07-14T00:00:00.000Z');
    vi.setSystemTime(now);
    timelineState = [{
      plan: {
        id: 'plan-future',
        medicine_name: '餐前药',
        dosage: '1片',
        remind_enabled: true,
        remind_before_minutes: 5,
      },
      scheduled_time: '08:10',
      scheduled_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
      status: 'pending',
    }];

    render(<MedicinePage />);
    expect(screen.getByRole('heading', { name: '用药管家' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(screen.getByRole('heading', { name: '该吃药啦！' })).toBeInTheDocument();
    expect(screen.getByText('餐前药')).toBeInTheDocument();
  });

  it('切换照护目标首帧不展示或操作上一位长辈的用药', () => {
    targetUserIdState = 'elder-2';
    timelineTargetKeyState = 'elder-1';
    plansTargetKeyState = 'elder-1';

    render(<MedicinePage />);

    expect(screen.getByText('加载中...')).toBeInTheDocument();
    expect(screen.queryByText('降压药')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '确认服用' })).not.toBeInTheDocument();
  });

  it('确认当前发生项后只隐藏该项并立即显示下一项', async () => {
    render(<MedicinePage />);
    expect(screen.getByText('降压药')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '我已吃药' }));

    await waitFor(() => {
      expect(confirmMedication).toHaveBeenCalled();
      expect(screen.getByText('维生素')).toBeInTheDocument();
    });
    expect(screen.queryByText('降压药')).not.toBeInTheDocument();
  });

  it('SOS 调用真实紧急呼叫接口', async () => {
    render(<MedicinePage />);
    fireEvent.click(screen.getByRole('button', { name: 'SOS 紧急呼叫' }));

    await waitFor(() => {
      expect(fetchApi).toHaveBeenCalledWith('/api/v1/emergency/trigger', {
        method: 'POST',
        body: expect.objectContaining({
          request_id: expect.any(String),
          trigger_method: 'button',
        }),
      });
    });
    expect(screen.getByRole('status')).toHaveTextContent('已通知 1 位家属');
  });

  it('家属代管的用药提醒不显示长辈本人 SOS 入口', () => {
    isSelfState = false;
    isFamilyState = true;
    render(<MedicinePage />);
    expect(screen.queryByRole('button', { name: 'SOS 紧急呼叫' })).not.toBeInTheDocument();
  });

  it('药品全名最多显示两行，不以省略号隐藏关键信息', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'app/medicine/page.module.css'),
      'utf8',
    );
    const medicineNameRule = css.match(/\.medicineName\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(medicineNameRule).toMatch(/white-space:\s*normal/);
    expect(medicineNameRule).toMatch(/-webkit-line-clamp:\s*2/);
    expect(medicineNameRule).not.toMatch(/text-overflow:\s*ellipsis/);
  });

  it('横屏短视口使用双栏提醒布局并完整展示两个主操作', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'app/medicine/page.module.css'),
      'utf8',
    );
    const landscapeRule = css.slice(
      css.indexOf('@media (orientation: landscape) and (min-width: 640px) and (max-height: 600px)'),
    );

    expect(landscapeRule).toMatch(
      /\.reminderPage\s*\{[\s\S]*?grid-template-columns:\s*minmax\(/,
    );
    expect(landscapeRule).toMatch(
      /\.actions\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,/,
    );
    expect(landscapeRule).not.toMatch(
      /\.reminderPage\s*\{[\s\S]*?overflow-y:\s*auto/,
    );
  });
});

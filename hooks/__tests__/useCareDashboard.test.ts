import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CareDashboardResponse } from '@/types/careDashboard';

vi.mock('@/lib/api', () => ({ fetchApi: vi.fn() }));

import { fetchApi } from '@/lib/api';
import { useCareDashboard } from '../useCareDashboard';

const mockFetchApi = vi.mocked(fetchApi);

function dashboard(userId: string): CareDashboardResponse {
  return {
    target_user_id: userId,
    date: '2026-07-14',
    access: { health: true, medication: true },
    todayMedication: { completed: 1, total: 2, rate: 50 },
    medicationAdherence: [],
    adherence7d: 75,
    latestVitals: {},
    heartRateTrend: [],
    abnormalCount7d: 0,
    updatedAt: '2026-07-14T04:00:00.000Z',
  };
}

describe('useCareDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('按目标长辈一次加载聚合数据', async () => {
    mockFetchApi.mockResolvedValue(dashboard('elder-1'));
    const { result } = renderHook(() => useCareDashboard('elder-1'));

    await waitFor(() => expect(result.current.data?.target_user_id).toBe('elder-1'));
    expect(mockFetchApi).toHaveBeenCalledWith(
      '/api/v1/family/dashboard?user_id=elder-1',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('切换长辈时中止旧请求并清除旧目标数据', async () => {
    const pending = new Promise<CareDashboardResponse>(() => {});
    mockFetchApi
      .mockReturnValueOnce(pending)
      .mockResolvedValueOnce(dashboard('elder-2'));
    const { result, rerender } = renderHook(
      ({ target }) => useCareDashboard(target),
      { initialProps: { target: 'elder-1' as string | null } },
    );

    const firstSignal = mockFetchApi.mock.calls[0][1]?.signal;
    rerender({ target: 'elder-2' });

    expect(firstSignal?.aborted).toBe(true);
    expect(result.current.data).toBeNull();
    await waitFor(() => expect(result.current.data?.target_user_id).toBe('elder-2'));
  });

  it('重试会重新请求相同长辈', async () => {
    mockFetchApi
      .mockRejectedValueOnce(new Error('网络错误'))
      .mockResolvedValueOnce(dashboard('elder-1'));
    const { result } = renderHook(() => useCareDashboard('elder-1'));

    await waitFor(() => expect(result.current.error).toBe('网络错误'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(mockFetchApi).toHaveBeenCalledTimes(2);
  });
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { useEmergencyTrigger } from '../useEmergencyTrigger';

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  fetchApi: mocks.fetchApi,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((onResolve) => { resolve = onResolve; });
  return { promise, resolve };
}

const sentResponse = {
  id: 'call-1',
  notification_status: 'sent' as const,
  recipient_count: 2,
  replayed: false,
};

describe('useEmergencyTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => '11111111-1111-4111-8111-111111111111') });
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: vi.fn().mockResolvedValue({ state: 'denied' }) },
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: vi.fn() },
    });
  });

  it('同步阻止双击，只发送一次并按真实收件人数反馈', async () => {
    const pending = deferred<typeof sentResponse>();
    mocks.fetchApi.mockReturnValue(pending.promise);
    const hook = renderHook(() => useEmergencyTrigger());

    act(() => {
      void hook.result.current.trigger();
      void hook.result.current.trigger();
    });
    await waitFor(() => expect(mocks.fetchApi).toHaveBeenCalledTimes(1));
    pending.resolve(sentResponse);

    await waitFor(() => expect(hook.result.current.feedback).toEqual({
      kind: 'success',
      message: '紧急求助已发出，已通知 2 位家属',
    }));
  });

  it('请求进行中暴露 loading 供页面显示明确发送状态', async () => {
    const pending = deferred<typeof sentResponse>();
    mocks.fetchApi.mockReturnValue(pending.promise);
    const hook = renderHook(() => useEmergencyTrigger());

    act(() => { void hook.result.current.trigger(); });
    expect(hook.result.current.isLoading).toBe(true);
    pending.resolve(sentResponse);
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
  });

  it('零收件人显示明确警告并提示立即拨打 120', async () => {
    mocks.fetchApi.mockResolvedValue({
      ...sentResponse,
      notification_status: 'no_recipients',
      recipient_count: 0,
    });
    const hook = renderHook(() => useEmergencyTrigger());

    await act(async () => { await hook.result.current.trigger(); });

    expect(hook.result.current.feedback).toEqual({
      kind: 'warning',
      message: '未找到可接收紧急通知的家属，请检查绑定设置，并立即拨打 120',
    });
  });

  it.each([
    ['网络失败', new ApiError('网络连接失败', null)],
    ['服务端失败', new ApiError('暂时不可用', 503)],
  ])('%s 后重试复用同一 request_id', async (_label, error) => {
    mocks.fetchApi.mockRejectedValueOnce(error).mockResolvedValueOnce(sentResponse);
    const hook = renderHook(() => useEmergencyTrigger());

    await act(async () => { await hook.result.current.trigger(); });
    expect(hook.result.current.feedback?.kind).toBe('error');
    await act(async () => { await hook.result.current.trigger(); });

    const bodies = mocks.fetchApi.mock.calls.map((call) => call[1].body);
    expect(bodies[0].request_id).toBe(bodies[1].request_id);
  });

  it('不确定失败重试复用同一完整 payload，不重新读取定位', async () => {
    vi.mocked(navigator.permissions.query).mockResolvedValue({ state: 'granted' } as PermissionStatus);
    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation((success) => {
      success({ coords: { latitude: 30.5, longitude: 114.3, accuracy: 15 } } as GeolocationPosition);
    });
    mocks.fetchApi
      .mockRejectedValueOnce(new ApiError('暂时不可用', 503))
      .mockResolvedValueOnce(sentResponse);
    const hook = renderHook(() => useEmergencyTrigger());

    await act(async () => { await hook.result.current.trigger(); });
    await act(async () => { await hook.result.current.trigger(); });

    expect(mocks.fetchApi.mock.calls[0][1].body).toEqual(mocks.fetchApi.mock.calls[1][1].body);
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('确定性 4xx 后清除 request_id，下一次生成新值', async () => {
    const randomUUID = vi.fn()
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222');
    vi.stubGlobal('crypto', { randomUUID });
    mocks.fetchApi.mockRejectedValueOnce(new ApiError('参数错误', 400)).mockResolvedValueOnce(sentResponse);
    const hook = renderHook(() => useEmergencyTrigger());

    await act(async () => { await hook.result.current.trigger(); });
    await act(async () => { await hook.result.current.trigger(); });

    expect(mocks.fetchApi.mock.calls[0][1].body.request_id)
      .not.toBe(mocks.fetchApi.mock.calls[1][1].body.request_id);
  });

  it('409 幂等键载荷冲突后清除 pending payload', async () => {
    const randomUUID = vi.fn()
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222');
    vi.stubGlobal('crypto', { randomUUID });
    mocks.fetchApi
      .mockRejectedValueOnce(new ApiError('同一请求编号的内容不一致', 409))
      .mockResolvedValueOnce(sentResponse);
    const hook = renderHook(() => useEmergencyTrigger());
    await act(async () => { await hook.result.current.trigger(); });
    await act(async () => { await hook.result.current.trigger(); });
    expect(mocks.fetchApi.mock.calls[0][1].body.request_id)
      .not.toBe(mocks.fetchApi.mock.calls[1][1].body.request_id);
  });

  it('权限未 granted 时不读取定位，仍立即发起 SOS', async () => {
    mocks.fetchApi.mockResolvedValue(sentResponse);
    const hook = renderHook(() => useEmergencyTrigger());

    await act(async () => { await hook.result.current.trigger(); });

    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(mocks.fetchApi.mock.calls[0][1].body).not.toHaveProperty('location');
  });

  it('权限已 granted 时携带坐标白名单', async () => {
    vi.mocked(navigator.permissions.query).mockResolvedValue({ state: 'granted' } as PermissionStatus);
    vi.mocked(navigator.geolocation.getCurrentPosition).mockImplementation((success) => {
      success({ coords: { latitude: 30.5, longitude: 114.3, accuracy: 15 } } as GeolocationPosition);
    });
    mocks.fetchApi.mockResolvedValue(sentResponse);
    const hook = renderHook(() => useEmergencyTrigger());

    await act(async () => { await hook.result.current.trigger(); });

    expect(mocks.fetchApi.mock.calls[0][1].body.location).toEqual({
      latitude: 30.5,
      longitude: 114.3,
      accuracy: 15,
    });
  });

  it('权限查询永不返回时在短界限内无定位继续 POST', async () => {
    vi.useFakeTimers();
    vi.mocked(navigator.permissions.query).mockReturnValue(new Promise(() => undefined));
    mocks.fetchApi.mockResolvedValue(sentResponse);
    const hook = renderHook(() => useEmergencyTrigger());

    let pending!: ReturnType<typeof hook.result.current.trigger>;
    act(() => { pending = hook.result.current.trigger(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(150); });
    await act(async () => { await pending; });

    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(mocks.fetchApi).toHaveBeenCalledOnce();
    expect(mocks.fetchApi.mock.calls[0][1].body).not.toHaveProperty('location');
    vi.useRealTimers();
  });
});

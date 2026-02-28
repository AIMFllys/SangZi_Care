import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEmergency } from '../useEmergency';

// ------ Mocks ------

const mockMakePhoneCall = vi.fn<(phone: string) => Promise<boolean>>();

vi.mock('@/lib/jsbridge', () => ({
  jsBridge: {
    get isInWebView() { return true; },
    makePhoneCall: (...args: Parameters<typeof mockMakePhoneCall>) => mockMakePhoneCall(...args),
  },
}));

const mockFetchApi = vi.fn();
vi.mock('@/lib/api', () => ({
  fetchApi: (...args: unknown[]) => mockFetchApi(...args),
}));

// familyStore mock — we control getState() directly
const mockFamilyStoreState = {
  binds: [] as Array<{
    bind: { status: string; can_receive_emergency: boolean };
    user: { phone: string };
  }>,
};

vi.mock('@/stores/familyStore', () => ({
  useFamilyStore: {
    getState: () => mockFamilyStoreState,
  },
}));

// ------ Helpers ------

function setFamilyBinds(
  binds: typeof mockFamilyStoreState.binds,
) {
  mockFamilyStoreState.binds = binds;
}

function makeBind(phone: string, canReceiveEmergency = true, status = 'active') {
  return {
    bind: { status, can_receive_emergency: canReceiveEmergency },
    user: { phone },
  };
}

// ------ Tests ------

describe('useEmergency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMakePhoneCall.mockResolvedValue(true);
    mockFetchApi.mockResolvedValue({ id: 'emergency-123' });
    setFamilyBinds([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // --- Initial state ---

  it('starts in idle state with countdown 0', () => {
    const { result } = renderHook(() => useEmergency());
    expect(result.current.state).toBe('idle');
    expect(result.current.countdown).toBe(0);
  });

  // --- Trigger → confirming ---

  it('enters confirming state with 3s countdown on trigger', () => {
    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });

    expect(result.current.state).toBe('confirming');
    expect(result.current.countdown).toBe(3);
  });

  it('counts down from 3 to 0 during confirming', () => {
    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });
    expect(result.current.countdown).toBe(3);

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.countdown).toBe(2);

    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.countdown).toBe(1);
  });

  // --- Cancel during confirming ---

  it('transitions to cancelled state on cancel', () => {
    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });
    act(() => { result.current.cancel(); });

    expect(result.current.state).toBe('cancelled');
    expect(result.current.countdown).toBe(0);
  });

  it('calls POST /emergency/cancel when cancelled', () => {
    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });
    act(() => { result.current.cancel(); });

    expect(mockFetchApi).toHaveBeenCalledWith(
      '/api/v1/emergency/cancel',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  // --- Confirm countdown expires → no family → call 110 ---

  it('calls 110 directly when no family bound after countdown expires', async () => {
    setFamilyBinds([]);
    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });

    // Advance past 3s confirm countdown
    await act(async () => { vi.advanceTimersByTime(3000); });

    // Should have called POST /emergency/trigger
    expect(mockFetchApi).toHaveBeenCalledWith(
      '/api/v1/emergency/trigger',
      expect.objectContaining({ method: 'POST' }),
    );

    // No family → calls 110 directly
    expect(mockMakePhoneCall).toHaveBeenCalledWith('110');
    expect(result.current.state).toBe('completed');
  });

  // --- Confirm countdown expires → has family → call family then 110 ---

  it('calls family first, then starts 5s countdown for 110', async () => {
    setFamilyBinds([makeBind('13800001111')]);
    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });

    // Advance past 3s confirm countdown
    await act(async () => { vi.advanceTimersByTime(3000); });

    // Should call family phone
    expect(mockMakePhoneCall).toHaveBeenCalledWith('13800001111');
    expect(result.current.state).toBe('waiting_110');
    expect(result.current.countdown).toBe(5);
  });

  it('calls 110 after 5s waiting countdown', async () => {
    setFamilyBinds([makeBind('13800001111')]);
    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });

    // 3s confirm
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(result.current.state).toBe('waiting_110');

    // 5s wait for 110
    await act(async () => { vi.advanceTimersByTime(5000); });

    expect(mockMakePhoneCall).toHaveBeenCalledWith('110');
    expect(result.current.state).toBe('completed');
  });

  // --- confirmNow skips countdown ---

  it('skips confirm countdown when confirmNow is called', async () => {
    setFamilyBinds([]);
    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });
    expect(result.current.state).toBe('confirming');

    await act(async () => { result.current.confirmNow(); });

    // Should have triggered immediately without waiting 3s
    expect(mockFetchApi).toHaveBeenCalledWith(
      '/api/v1/emergency/trigger',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockMakePhoneCall).toHaveBeenCalledWith('110');
  });

  it('confirmNow does nothing when not in confirming state', () => {
    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.confirmNow(); });

    expect(result.current.state).toBe('idle');
    expect(mockFetchApi).not.toHaveBeenCalled();
  });

  // --- No permission (makePhoneCall fails) ---

  it('transitions to no_permission when 110 call fails', async () => {
    setFamilyBinds([]);
    mockMakePhoneCall.mockResolvedValue(false);

    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });
    await act(async () => { vi.advanceTimersByTime(3000); });

    expect(result.current.state).toBe('no_permission');
  });

  it('starts 110 countdown when family call fails', async () => {
    setFamilyBinds([makeBind('13800001111')]);
    // Family call fails, 110 call succeeds
    mockMakePhoneCall
      .mockResolvedValueOnce(false)  // family call fails
      .mockResolvedValueOnce(true);  // 110 succeeds

    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });
    await act(async () => { vi.advanceTimersByTime(3000); });

    // Even though family call failed, should proceed to waiting_110
    expect(result.current.state).toBe('waiting_110');
  });

  // --- Cancel during waiting_110 ---

  it('can cancel during waiting_110 countdown', async () => {
    setFamilyBinds([makeBind('13800001111')]);
    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(result.current.state).toBe('waiting_110');

    act(() => { result.current.cancel(); });
    expect(result.current.state).toBe('cancelled');

    // Advancing time should NOT call 110
    mockMakePhoneCall.mockClear();
    await act(async () => { vi.advanceTimersByTime(5000); });
    // makePhoneCall should not have been called again after cancel
    expect(mockMakePhoneCall).not.toHaveBeenCalledWith('110');
  });

  // --- Reset ---

  it('resets to idle state', async () => {
    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });
    expect(result.current.state).toBe('confirming');

    act(() => { result.current.reset(); });
    expect(result.current.state).toBe('idle');
    expect(result.current.countdown).toBe(0);
  });

  // --- Re-trigger after completed/cancelled ---

  it('can re-trigger after cancelled', () => {
    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });
    act(() => { result.current.cancel(); });
    expect(result.current.state).toBe('cancelled');

    act(() => { result.current.trigger(); });
    expect(result.current.state).toBe('confirming');
  });

  it('can re-trigger after completed', async () => {
    setFamilyBinds([]);
    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(result.current.state).toBe('completed');

    act(() => { result.current.trigger(); });
    expect(result.current.state).toBe('confirming');
  });

  // --- Ignores duplicate trigger ---

  it('ignores trigger when already in confirming state', () => {
    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });
    expect(result.current.state).toBe('confirming');

    // Trigger again — should be ignored
    act(() => { result.current.trigger(); });
    expect(result.current.state).toBe('confirming');
    expect(result.current.countdown).toBe(3);
  });

  // --- Family selection: picks first with emergency permission ---

  it('skips family members without emergency permission', async () => {
    setFamilyBinds([
      makeBind('13800001111', false),  // no emergency permission
      makeBind('13800002222', true),   // has emergency permission
    ]);

    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });
    await act(async () => { vi.advanceTimersByTime(3000); });

    expect(mockMakePhoneCall).toHaveBeenCalledWith('13800002222');
  });

  it('skips inactive family binds', async () => {
    setFamilyBinds([
      makeBind('13800001111', true, 'inactive'),
      makeBind('13800002222', true, 'active'),
    ]);

    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });
    await act(async () => { vi.advanceTimersByTime(3000); });

    expect(mockMakePhoneCall).toHaveBeenCalledWith('13800002222');
  });

  // --- Backend notification failure doesn't block flow ---

  it('continues emergency flow even if backend trigger fails', async () => {
    setFamilyBinds([]);
    mockFetchApi.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useEmergency());

    act(() => { result.current.trigger(); });
    await act(async () => { vi.advanceTimersByTime(3000); });

    // Should still call 110 despite backend failure
    expect(mockMakePhoneCall).toHaveBeenCalledWith('110');
  });
});

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAIChat } from '../useAIChat';

const mocks = vi.hoisted(() => ({ fetchApi: vi.fn() }));

vi.mock('@/lib/api', () => ({ fetchApi: mocks.fetchApi }));

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

describe('useAIChat cancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sendMessage 返回助手回复并把 AbortSignal 交给 API', async () => {
    mocks.fetchApi.mockResolvedValue({ reply: '记得按时吃药', session_id: 's-1' });
    const hook = renderHook(() => useAIChat());
    let reply = '';

    await act(async () => {
      reply = await hook.result.current.sendMessage('提醒我吃药');
    });

    expect(reply).toBe('记得按时吃药');
    expect(mocks.fetchApi).toHaveBeenCalledWith('/api/v1/ai/chat', expect.objectContaining({
      method: 'POST',
      signal: expect.any(AbortSignal),
    }));
    expect(hook.result.current.messages.map((message) => message.content))
      .toEqual(['提醒我吃药', '记得按时吃药']);
  });

  it('cancelPending 中止当前请求，迟到响应不会追加助手消息', async () => {
    const response = deferred<{ reply: string; session_id: string }>();
    mocks.fetchApi.mockReturnValue(response.promise);
    const hook = renderHook(() => useAIChat());
    let pending!: Promise<string>;
    act(() => {
      pending = hook.result.current.sendMessage('旧问题');
    });
    await waitFor(() => expect(mocks.fetchApi).toHaveBeenCalledOnce());
    const signal = mocks.fetchApi.mock.calls[0][1].signal as AbortSignal;

    act(() => hook.result.current.cancelPending());
    expect(signal.aborted).toBe(true);

    response.resolve({ reply: '迟到回复', session_id: 'old-session' });
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(hook.result.current.messages.map((message) => message.content))
      .toEqual(['旧问题']);
    expect(hook.result.current.isLoading).toBe(false);
  });

  it('卸载会中止仍在进行的请求', async () => {
    mocks.fetchApi.mockReturnValue(new Promise(() => undefined));
    const hook = renderHook(() => useAIChat());
    act(() => {
      void hook.result.current.sendMessage('离开页面');
    });
    await waitFor(() => expect(mocks.fetchApi).toHaveBeenCalledOnce());
    const signal = mocks.fetchApi.mock.calls[0][1].signal as AbortSignal;

    hook.unmount();

    expect(signal.aborted).toBe(true);
  });
});

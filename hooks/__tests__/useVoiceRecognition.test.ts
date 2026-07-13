import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { useVoiceStore } from '@/stores/voiceStore';
import { useVoiceRecognition } from '../useVoiceRecognition';

const mocks = vi.hoisted(() => ({
  startRecorder: vi.fn(),
  fetchFormData: vi.fn(),
}));

vi.mock('@/lib/audio/recorder', () => ({
  startPcmWavRecording: mocks.startRecorder,
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, fetchFormData: mocks.fetchFormData };
});

interface RecorderSession {
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

const recordingBlob = new Blob(['RIFF....WAVE'], { type: 'audio/wav' });
const recordingResult = {
  blob: recordingBlob,
  durationMs: 1_250,
  sampleRate: 16_000,
};

function makeSession(): RecorderSession {
  return {
    stop: vi.fn().mockResolvedValue(recordingResult),
    abort: vi.fn(),
  };
}

function resetVoiceStore(levels: Array<'mimo' | 'web'> = ['mimo', 'web']): void {
  useVoiceStore.setState({
    asrLevels: levels as never,
    currentASRLevel: levels[0] as never,
    isDetected: true,
  });
}

class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];

  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: { error: string; message?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  abort = vi.fn().mockImplementation(() => queueMicrotask(() => this.onend?.()));
  stop = vi.fn().mockImplementation(() => queueMicrotask(() => this.onend?.()));

  constructor() {
    FakeSpeechRecognition.instances.push(this);
  }

  emitFinal(text: string): void {
    this.onresult?.({
      resultIndex: 0,
      results: [{
        0: { transcript: text },
        isFinal: true,
        length: 1,
      }],
    });
  }
}

function enableWebRecognition(): void {
  Object.defineProperty(window, 'SpeechRecognition', {
    configurable: true,
    value: FakeSpeechRecognition,
  });
}

async function startRecording(
  session = makeSession(),
): Promise<{
  hook: ReturnType<typeof renderHook<ReturnType<typeof useVoiceRecognition>, unknown>>;
  session: RecorderSession;
}> {
  mocks.startRecorder.mockResolvedValueOnce(session);
  const hook = renderHook(() => useVoiceRecognition());
  await act(async () => {
    await hook.result.current.startListening();
  });
  expect(hook.result.current.phase).toBe('recording');
  return { hook, session };
}

describe('useVoiceRecognition MiMo state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    FakeSpeechRecognition.instances = [];
    resetVoiceStore();
    mocks.fetchFormData.mockResolvedValue({ text: '今天记得吃药' });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  });

  it('从请求权限进入录音，并把外部 AbortSignal 交给 PCM 录音器', async () => {
    const pendingRecorder = deferred<RecorderSession>();
    mocks.startRecorder.mockReturnValue(pendingRecorder.promise);
    const hook = renderHook(() => useVoiceRecognition());
    let start!: Promise<void>;

    await act(async () => {
      start = hook.result.current.startListening();
      await Promise.resolve();
    });
    expect(hook.result.current.phase).toBe('requesting_permission');
    expect(hook.result.current.isListening).toBe(true);
    expect(mocks.startRecorder).toHaveBeenCalledWith({
      maxDurationMs: 60_000,
      signal: expect.any(AbortSignal),
    });

    await act(async () => {
      pendingRecorder.resolve(makeSession());
      await start;
    });
    expect(hook.result.current.phase).toBe('recording');
  });

  it('stop 等待 WAV 与 MiMo 转写，并发调用复用同一个 Promise', async () => {
    const stopResult = deferred<typeof recordingResult>();
    const session = makeSession();
    session.stop.mockReturnValue(stopResult.promise);
    const transcript = deferred<{ text: string }>();
    mocks.fetchFormData.mockReturnValue(transcript.promise);
    const { hook } = await startRecording(session);
    let first!: Promise<unknown>;
    let second!: Promise<unknown>;

    act(() => {
      first = hook.result.current.stopListening();
      second = hook.result.current.stopListening();
    });
    expect(second).toBe(first);
    expect(hook.result.current.phase).toBe('transcribing');
    expect(session.stop).toHaveBeenCalledOnce();

    stopResult.resolve(recordingResult);
    await waitFor(() => expect(mocks.fetchFormData).toHaveBeenCalledOnce());
    const [path, formData, options] = mocks.fetchFormData.mock.calls[0] as [
      string,
      FormData,
      { signal: AbortSignal },
    ];
    const file = formData.get('file') as File;
    expect(path).toBe('/api/v1/voice/transcribe');
    expect(file.name).toBe('recording.wav');
    expect(file.type).toBe('audio/wav');
    expect(options.signal).toBeInstanceOf(AbortSignal);

    transcript.resolve({ text: '  今天记得吃药  ' });
    let result: unknown;
    await act(async () => {
      result = await first;
    });
    expect(result).toEqual({
      transcript: '今天记得吃药',
      audioBlob: recordingBlob,
      durationMs: 1_250,
    });
    expect(hook.result.current.transcript).toBe('今天记得吃药');
    expect(hook.result.current.phase).toBe('success');
  });

  it('idle stop 返回 null 且不访问录音器', async () => {
    const hook = renderHook(() => useVoiceRecognition());

    await expect(hook.result.current.stopListening()).resolves.toBeNull();
    expect(mocks.startRecorder).not.toHaveBeenCalled();
  });

  it('权限拒绝显示可操作错误且不降级', async () => {
    mocks.startRecorder.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
    const hook = renderHook(() => useVoiceRecognition());

    await act(async () => {
      await hook.result.current.startListening();
    });

    expect(hook.result.current.phase).toBe('error');
    expect(hook.result.current.error).toContain('麦克风权限');
    expect(useVoiceStore.getState().currentASRLevel).toBe('mimo');
    expect(mocks.fetchFormData).not.toHaveBeenCalled();
  });

  it('请求权限期间 cancel 会中止 signal 且不留下错误', async () => {
    let signal!: AbortSignal;
    mocks.startRecorder.mockImplementation(({ signal: receivedSignal }) => {
      signal = receivedSignal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        }, { once: true });
      });
    });
    const hook = renderHook(() => useVoiceRecognition());
    let start!: Promise<void>;
    await act(async () => {
      start = hook.result.current.startListening();
      await Promise.resolve();
    });

    act(() => hook.result.current.cancelListening());
    await act(async () => start);

    expect(signal.aborted).toBe(true);
    expect(hook.result.current.phase).toBe('idle');
    expect(hook.result.current.error).toBeNull();
  });

  it('请求权限期间 stop 同样中止申请，不会稍后意外进入录音', async () => {
    let signal!: AbortSignal;
    mocks.startRecorder.mockImplementation(({ signal: receivedSignal }) => {
      signal = receivedSignal;
      return new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        }, { once: true });
      });
    });
    const hook = renderHook(() => useVoiceRecognition());
    let start!: Promise<void>;
    await act(async () => {
      start = hook.result.current.startListening();
      await Promise.resolve();
    });

    let stopResult: unknown;
    await act(async () => {
      stopResult = await hook.result.current.stopListening();
      await start;
    });

    expect(stopResult).toBeNull();
    expect(signal.aborted).toBe(true);
    expect(hook.result.current.phase).toBe('idle');
  });

  it('录音期间 cancel 调用 session.abort 且不上传', async () => {
    const { hook, session } = await startRecording();

    act(() => hook.result.current.cancelListening());

    expect(session.abort).toHaveBeenCalledOnce();
    expect(mocks.fetchFormData).not.toHaveBeenCalled();
    expect(hook.result.current.phase).toBe('idle');
  });

  it('转写期间 cancel 中止请求，stop 结算为 null', async () => {
    mocks.fetchFormData.mockImplementation((_path, _body, options) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        }, { once: true });
      }));
    const { hook } = await startRecording();
    let stop!: Promise<unknown>;
    act(() => {
      stop = hook.result.current.stopListening();
    });
    await waitFor(() => expect(mocks.fetchFormData).toHaveBeenCalledOnce());

    act(() => hook.result.current.cancelListening());
    await expect(stop).resolves.toBeNull();
    expect(hook.result.current.phase).toBe('idle');
    expect(hook.result.current.transcript).toBe('');
  });

  it('卸载时中止录音并释放 session', async () => {
    const { hook, session } = await startRecording();

    hook.unmount();

    expect(session.abort).toHaveBeenCalledOnce();
  });

  it('旧转写在取消并开始新录音后完成，不覆盖新结果', async () => {
    const firstSession = makeSession();
    const secondSession = makeSession();
    mocks.startRecorder
      .mockResolvedValueOnce(firstSession)
      .mockResolvedValueOnce(secondSession);
    const oldResponse = deferred<{ text: string }>();
    mocks.fetchFormData
      .mockReturnValueOnce(oldResponse.promise)
      .mockResolvedValueOnce({ text: '新结果' });
    const hook = renderHook(() => useVoiceRecognition());
    await act(async () => hook.result.current.startListening());
    let oldStop!: Promise<unknown>;
    act(() => {
      oldStop = hook.result.current.stopListening();
    });
    await waitFor(() => expect(mocks.fetchFormData).toHaveBeenCalledTimes(1));

    act(() => hook.result.current.cancelListening());
    await act(async () => hook.result.current.startListening());
    let newResult: unknown;
    await act(async () => {
      newResult = await hook.result.current.stopListening();
    });
    expect(newResult).toEqual(expect.objectContaining({ transcript: '新结果' }));

    let oldResult: unknown;
    await act(async () => {
      oldResponse.resolve({ text: '旧结果' });
      oldResult = await oldStop;
    });
    expect(oldResult).toBeNull();
    expect(hook.result.current.transcript).toBe('新结果');
    expect(hook.result.current.phase).toBe('success');
  });

  it('MiMo 可重试故障只把下一次录音切到 Web，不追溯启动 Web', async () => {
    enableWebRecognition();
    mocks.fetchFormData.mockRejectedValueOnce(new ApiError('服务繁忙', 503));
    const { hook } = await startRecording();

    let failure: unknown;
    await act(async () => {
      try {
        await hook.result.current.stopListening();
      } catch (error) {
        failure = error;
      }
    });
    expect(failure).toEqual(expect.objectContaining({
      message: expect.stringContaining('本次录音转写失败'),
    }));
    expect(FakeSpeechRecognition.instances).toHaveLength(0);
    expect(useVoiceStore.getState().currentASRLevel).toBe('web');
    expect(hook.result.current.phase).toBe('error');

    mocks.startRecorder.mockResolvedValueOnce(makeSession());
    await act(async () => hook.result.current.startListening());
    expect(FakeSpeechRecognition.instances).toHaveLength(1);
    act(() => hook.result.current.cancelListening());
  });

  it('422 未识别到语音不切换 Web fallback', async () => {
    enableWebRecognition();
    mocks.fetchFormData.mockRejectedValue(new ApiError('未识别到有效语音', 422));
    const { hook } = await startRecording();

    let failure: unknown;
    await act(async () => {
      try {
        await hook.result.current.stopListening();
      } catch (error) {
        failure = error;
      }
    });
    expect(failure).toEqual(expect.objectContaining({
      message: expect.stringContaining('未识别到有效语音'),
    }));
    expect(useVoiceStore.getState().currentASRLevel).toBe('mimo');
    expect(FakeSpeechRecognition.instances).toHaveLength(0);
  });

  it('Web fallback 下一次录音并行保留 WAV 与最终文本', async () => {
    enableWebRecognition();
    resetVoiceStore(['web']);
    const { hook } = await startRecording();
    const recognition = FakeSpeechRecognition.instances[0];
    expect(recognition.start).toHaveBeenCalledOnce();
    expect(recognition.lang).toBe('zh-CN');
    act(() => recognition.emitFinal('浏览器识别'));

    let result: unknown;
    await act(async () => {
      result = await hook.result.current.stopListening();
    });

    expect(result).toEqual({
      transcript: '浏览器识别',
      audioBlob: recordingBlob,
      durationMs: 1_250,
    });
    expect(mocks.fetchFormData).not.toHaveBeenCalled();
    expect(recognition.stop).toHaveBeenCalledOnce();
  });

  it('Web fallback API 已不可用时释放已打开的 PCM session', async () => {
    resetVoiceStore(['web']);
    const session = makeSession();
    mocks.startRecorder.mockResolvedValue(session);
    const hook = renderHook(() => useVoiceRecognition());

    await act(async () => {
      await hook.result.current.startListening();
    });

    expect(session.abort).toHaveBeenCalledOnce();
    expect(hook.result.current.phase).toBe('error');
    expect(hook.result.current.error).toContain('浏览器语音识别不可用');
  });

  it('Web recognition 提前报错时不会产生悬空拒绝，stop 返回明确错误', async () => {
    enableWebRecognition();
    resetVoiceStore(['web']);
    const { hook } = await startRecording();
    const recognition = FakeSpeechRecognition.instances[0];

    act(() => recognition.onerror?.({ error: 'network' }));
    await Promise.resolve();
    let failure: unknown;
    await act(async () => {
      try {
        await hook.result.current.stopListening();
      } catch (error) {
        failure = error;
      }
    });

    expect(failure).toEqual(expect.objectContaining({
      message: expect.stringContaining('浏览器语音识别失败'),
    }));
    expect(hook.result.current.phase).toBe('error');
  });

  it('MiMo 空文本视为未识别，不写入成功状态', async () => {
    mocks.fetchFormData.mockResolvedValue({ text: '   ' });
    const { hook } = await startRecording();

    let failure: unknown;
    await act(async () => {
      try {
        await hook.result.current.stopListening();
      } catch (error) {
        failure = error;
      }
    });
    expect(failure).toEqual(expect.objectContaining({
      message: expect.stringContaining('未识别到有效语音'),
    }));
    expect(hook.result.current.transcript).toBe('');
    expect(hook.result.current.phase).toBe('error');
  });

  it('60 秒硬时限调用同一 stop 流程并完成转写', async () => {
    vi.useFakeTimers();
    const session = makeSession();
    mocks.startRecorder.mockResolvedValue(session);
    const hook = renderHook(() => useVoiceRecognition());
    await act(async () => hook.result.current.startListening());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(session.stop).toHaveBeenCalledOnce();
    expect(mocks.fetchFormData).toHaveBeenCalledOnce();
    expect(hook.result.current.phase).toBe('success');
    expect(hook.result.current.transcript).toBe('今天记得吃药');
    await expect(hook.result.current.stopListening()).resolves.toEqual({
      transcript: '今天记得吃药',
      audioBlob: recordingBlob,
      durationMs: 1_250,
    });
  });

  it('resetTranscript 清空文本和错误并回到 idle', async () => {
    const { hook } = await startRecording();
    await act(async () => {
      await hook.result.current.stopListening();
    });
    expect(hook.result.current.phase).toBe('success');

    act(() => hook.result.current.resetTranscript());

    expect(hook.result.current.transcript).toBe('');
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.phase).toBe('idle');
  });
});

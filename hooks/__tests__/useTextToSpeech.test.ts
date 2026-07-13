import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTextToSpeech } from '../useTextToSpeech';
import { useUserStore } from '@/stores/userStore';
import { useVoiceStore } from '@/stores/voiceStore';

const mocks = vi.hoisted(() => ({
  fetchBlob: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  API_BASE_URL: '',
  fetchBlob: mocks.fetchBlob,
}));

class FakeAudio {
  static instances: FakeAudio[] = [];
  static autoEnd = false;

  src: string;
  playbackRate = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  pause = vi.fn();
  play = vi.fn().mockImplementation(() => {
    if (FakeAudio.autoEnd) queueMicrotask(() => this.onended?.());
    return Promise.resolve();
  });

  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }
}

class FakeUtterance {
  lang = '';
  rate = 1;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(readonly text: string) { }
}

const createObjectURL = vi.fn(() => `blob:voice-${createObjectURL.mock.calls.length + 1}`);
const revokeObjectURL = vi.fn();

function setUser(options: {
  role?: 'elder' | 'family';
  voiceSpeed?: number | null;
} = {}): void {
  const role = options.role ?? 'elder';
  useUserStore.setState({
    user: {
      id: 'user-1',
      role,
      voice_speed: options.voiceSpeed ?? null,
    } as never,
    isElder: role === 'elder',
  });
}

function setVoiceLevels(levels: Array<'mimo' | 'web'> = ['mimo', 'web']): void {
  useVoiceStore.setState({
    ttsLevels: levels as never,
    currentTTSLevel: levels[0] as never,
    isDetected: true,
  });
}

function enableWebSpeech(): {
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
} {
  const speak = vi.fn().mockImplementation((utterance: FakeUtterance) => {
    queueMicrotask(() => utterance.onend?.());
  });
  const cancel = vi.fn();
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: { speak, cancel },
  });
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return { speak, cancel };
}

async function beginSpeech(
  hook: ReturnType<typeof renderHook<ReturnType<typeof useTextToSpeech>, unknown>>,
  text: string,
): Promise<{ pending: Promise<void> }> {
  let pending!: Promise<void>;
  await act(async () => {
    pending = hook.result.current.speak(text);
    await Promise.resolve();
  });
  await waitFor(() => expect(mocks.fetchBlob).toHaveBeenCalled());
  return { pending };
}

describe('useTextToSpeech', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FakeAudio.instances = [];
    FakeAudio.autoEnd = false;
    mocks.fetchBlob.mockResolvedValue(new Blob(['mp3'], { type: 'audio/mpeg' }));
    setUser();
    setVoiceLevels();
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).speechSynthesis;
    vi.unstubAllGlobals();
  });

  it('即使 Web Speech 可用也先请求 MiMo，且正文不携带 speed', async () => {
    const web = enableWebSpeech();
    setUser({ voiceSpeed: 1.25 });
    const hook = renderHook(() => useTextToSpeech());
    const { pending } = await beginSpeech(hook, '现在该吃药了');
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));
    const audio = FakeAudio.instances[0];

    expect(mocks.fetchBlob).toHaveBeenCalledWith('/api/v1/voice/tts', {
      method: 'POST',
      body: { text: '现在该吃药了' },
      signal: expect.any(AbortSignal),
    });
    expect(audio.playbackRate).toBe(1.25);
    expect(audio.play).toHaveBeenCalledOnce();
    expect(web.speak).not.toHaveBeenCalled();

    await act(async () => {
      audio.onended?.();
      await pending;
    });
    expect(hook.result.current.isSpeaking).toBe(false);
    expect(hook.result.current.currentLevel).toBe('mimo');
  });

  it.each([
    ['长辈默认', 'elder', null, 0.8],
    ['家属默认', 'family', null, 1],
    ['用户偏好', 'elder', 1.4, 1.4],
    ['下限钳制', 'elder', -3, 0.5],
    ['上限钳制', 'family', 9, 2],
    ['非有限回退', 'elder', Number.NaN, 0.8],
  ] as const)('%s语速为 %s', async (_label, role, voiceSpeed, expected) => {
    setUser({ role, voiceSpeed });
    FakeAudio.autoEnd = true;
    const hook = renderHook(() => useTextToSpeech());

    await act(async () => {
      await hook.result.current.speak('语速测试');
    });

    expect(FakeAudio.instances[0].playbackRate).toBe(expected);
  });

  it('stop 在请求期间中止 fetch，且不会显示错误或创建 Audio', async () => {
    let receivedSignal: AbortSignal | undefined;
    mocks.fetchBlob.mockImplementation((_path, options) => new Promise<Blob>((_resolve, reject) => {
      receivedSignal = options.signal;
      options.signal.addEventListener('abort', () => {
        reject(new DOMException('aborted', 'AbortError'));
      }, { once: true });
    }));
    const hook = renderHook(() => useTextToSpeech());
    const { pending } = await beginSpeech(hook, '中止请求');

    act(() => hook.result.current.stop());
    await act(async () => pending);

    expect(receivedSignal?.aborted).toBe(true);
    expect(FakeAudio.instances).toHaveLength(0);
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.isSpeaking).toBe(false);
  });

  it('stop 在播放期间只清理一次并结算 speak Promise', async () => {
    const hook = renderHook(() => useTextToSpeech());
    const { pending } = await beginSpeech(hook, '停止播放');
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));
    const audio = FakeAudio.instances[0];
    const url = audio.src;

    act(() => hook.result.current.stop());
    await act(async () => pending);
    act(() => hook.result.current.stop());

    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.onended).toBeNull();
    expect(audio.onerror).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith(url);
  });

  it('新 speak 取消旧播放，旧操作完成不会覆盖新状态', async () => {
    const hook = renderHook(() => useTextToSpeech());
    const { pending: first } = await beginSpeech(hook, '第一段');
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));
    const oldAudio = FakeAudio.instances[0];
    let second!: Promise<void>;

    await act(async () => {
      second = hook.result.current.speak('第二段');
      await Promise.resolve();
    });
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(2));
    const newAudio = FakeAudio.instances[1];

    await act(async () => first);
    expect(oldAudio.pause).toHaveBeenCalledOnce();
    expect(hook.result.current.isSpeaking).toBe(true);

    await act(async () => {
      newAudio.onended?.();
      await second;
    });
    expect(hook.result.current.isSpeaking).toBe(false);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('卸载时中止播放并回收 Blob URL', async () => {
    const hook = renderHook(() => useTextToSpeech());
    const { pending } = await beginSpeech(hook, '卸载清理');
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));
    const audio = FakeAudio.instances[0];

    hook.unmount();
    await pending;

    expect(audio.pause).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledOnce();
  });

  it('优先在中文句末分块并严格串行播放', async () => {
    const hook = renderHook(() => useTextToSpeech());
    const text = `${'好'.repeat(990)}。${'再'.repeat(20)}`;
    const { pending } = await beginSpeech(hook, text);
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));

    expect(mocks.fetchBlob).toHaveBeenCalledTimes(1);
    const firstText = mocks.fetchBlob.mock.calls[0][1].body.text as string;
    expect(firstText.endsWith('。')).toBe(true);
    expect(Array.from(firstText)).toHaveLength(991);

    act(() => FakeAudio.instances[0].onended?.());
    await waitFor(() => expect(mocks.fetchBlob).toHaveBeenCalledTimes(2));
    expect(FakeAudio.instances).toHaveLength(2);
    expect(mocks.fetchBlob.mock.calls[1][1].body).toEqual({ text: '再'.repeat(20) });

    await act(async () => {
      FakeAudio.instances[1].onended?.();
      await pending;
    });
  });

  it('按 Unicode code point 对无标点长句硬切 1000 字', async () => {
    FakeAudio.autoEnd = true;
    const hook = renderHook(() => useTextToSpeech());

    await act(async () => {
      await hook.result.current.speak('😀'.repeat(1001));
    });

    expect(mocks.fetchBlob).toHaveBeenCalledTimes(2);
    expect(Array.from(mocks.fetchBlob.mock.calls[0][1].body.text)).toHaveLength(1000);
    expect(Array.from(mocks.fetchBlob.mock.calls[1][1].body.text)).toHaveLength(1);
  });

  it('恰好 1000 字只请求一次，空白不请求', async () => {
    FakeAudio.autoEnd = true;
    const hook = renderHook(() => useTextToSpeech());

    await act(async () => {
      await hook.result.current.speak('字'.repeat(1000));
      await hook.result.current.speak('   \n  ');
    });

    expect(mocks.fetchBlob).toHaveBeenCalledTimes(1);
  });

  it('分块播放中 stop 不再请求后续块', async () => {
    const hook = renderHook(() => useTextToSpeech());
    const { pending } = await beginSpeech(hook, '甲'.repeat(1001));
    await waitFor(() => expect(FakeAudio.instances).toHaveLength(1));

    act(() => hook.result.current.stop());
    await act(async () => pending);

    expect(mocks.fetchBlob).toHaveBeenCalledTimes(1);
  });

  it('MiMo 失败后才显式降级到 Web Speech', async () => {
    const web = enableWebSpeech();
    mocks.fetchBlob.mockRejectedValue(new Error('MiMo 暂时不可用'));
    const hook = renderHook(() => useTextToSpeech());

    await act(async () => {
      await hook.result.current.speak('降级测试');
    });

    expect(mocks.fetchBlob).toHaveBeenCalledOnce();
    expect(web.speak).toHaveBeenCalledOnce();
    expect((web.speak.mock.calls[0][0] as FakeUtterance).text).toBe('降级测试');
    expect(hook.result.current.error).toBeNull();
    expect(useVoiceStore.getState().currentTTSLevel).toBe('web');
  });

  it('MiMo 且 Web 都不可用时显示可理解的中文错误', async () => {
    setVoiceLevels(['mimo']);
    mocks.fetchBlob.mockRejectedValue(new Error('上游失败'));
    const hook = renderHook(() => useTextToSpeech());

    await act(async () => {
      await hook.result.current.speak('失败测试');
    });

    expect(hook.result.current.isSpeaking).toBe(false);
    expect(hook.result.current.error).toContain('语音播放失败');
    expect(hook.result.current.error).toContain('上游失败');
  });
});

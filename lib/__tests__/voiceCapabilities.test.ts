import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/jsbridge', () => ({
  jsBridge: {
    nativeTTS: { isAvailable: vi.fn() },
    nativeASR: { isAvailable: vi.fn() },
  },
}));

import { jsBridge } from '@/lib/jsbridge';
import { detect } from '../voiceCapabilities';

const nativeTTS = jsBridge.nativeTTS.isAvailable as ReturnType<typeof vi.fn>;
const nativeASR = jsBridge.nativeASR.isAvailable as ReturnType<typeof vi.fn>;

describe('voiceCapabilities.detect transitional MiMo migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nativeTTS.mockResolvedValue(false);
    nativeASR.mockResolvedValue(false);
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).speechSynthesis;
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  });

  it('TTS 始终把 MiMo 放在首位且不再探测 Native TTS', async () => {
    nativeTTS.mockResolvedValue(true);

    const result = await detect();

    expect(result.tts).toEqual(['mimo']);
    expect(nativeTTS).not.toHaveBeenCalled();
  });

  it('Web Speech 可用时仅作为 MiMo 后备 TTS', async () => {
    (window as unknown as Record<string, unknown>).speechSynthesis = {};

    const result = await detect();

    expect(result.tts).toEqual(['mimo', 'web']);
  });

  it('Task 5 前暂时保留旧 ASR 能力顺序', async () => {
    (window as unknown as Record<string, unknown>).SpeechRecognition = class { };
    nativeASR.mockResolvedValue(true);

    const result = await detect();

    expect(result.asr).toEqual(['web', 'native', 'doubao']);
  });

  it('Native ASR 探测失败时安全回退到旧服务端级别', async () => {
    nativeASR.mockRejectedValue(new Error('bridge failed'));

    const result = await detect();

    expect(result.asr).toEqual(['doubao']);
  });
});

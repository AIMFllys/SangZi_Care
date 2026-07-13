import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVoiceStore } from '../voiceStore';

vi.mock('@/lib/voiceCapabilities', () => ({
  detect: vi.fn(),
}));

import { detect } from '@/lib/voiceCapabilities';

const mockDetect = detect as ReturnType<typeof vi.fn>;

describe('voiceStore final MiMo policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVoiceStore.setState(useVoiceStore.getInitialState(), true);
  });

  it('TTS 与 ASR 均默认从 MiMo 开始', () => {
    const state = useVoiceStore.getState();
    expect(state.ttsLevels).toEqual(['mimo']);
    expect(state.asrLevels).toEqual(['mimo']);
    expect(state.currentTTSLevel).toBe('mimo');
    expect(state.currentASRLevel).toBe('mimo');
  });

  it('能力检测只缓存一次并分别选择首项', async () => {
    mockDetect.mockResolvedValue({
      tts: ['mimo', 'web'],
      asr: ['mimo', 'web'],
    });

    await useVoiceStore.getState().detect();
    await useVoiceStore.getState().detect();

    expect(mockDetect).toHaveBeenCalledOnce();
    expect(useVoiceStore.getState()).toEqual(expect.objectContaining({
      currentTTSLevel: 'mimo',
      currentASRLevel: 'mimo',
      isDetected: true,
    }));
  });

  it('ASR 故障只把下一次尝试切换到 Web', () => {
    useVoiceStore.setState({
      asrLevels: ['mimo', 'web'] as never,
      currentASRLevel: 'mimo',
    });

    expect(useVoiceStore.getState().fallbackASR()).toBe(true);
    expect(useVoiceStore.getState().currentASRLevel).toBe('web');
    expect(useVoiceStore.getState().fallbackASR()).toBe(false);
  });

  it('TTS 故障可切换到同文本 Web 播放', () => {
    useVoiceStore.setState({
      ttsLevels: ['mimo', 'web'] as never,
      currentTTSLevel: 'mimo',
    });

    expect(useVoiceStore.getState().fallbackTTS()).toBe(true);
    expect(useVoiceStore.getState().currentTTSLevel).toBe('web');
  });
});

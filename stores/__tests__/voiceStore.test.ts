import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVoiceStore } from '../voiceStore';

vi.mock('@/lib/voiceCapabilities', () => ({
  detect: vi.fn(),
}));

import { detect } from '@/lib/voiceCapabilities';

const mockDetect = detect as ReturnType<typeof vi.fn>;

describe('voiceStore transitional MiMo migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVoiceStore.setState(useVoiceStore.getInitialState(), true);
  });

  it('默认从 MiMo TTS 与旧 ASR 服务端级别开始', () => {
    const state = useVoiceStore.getState();
    expect(state.ttsLevels).toEqual(['mimo']);
    expect(state.currentTTSLevel).toBe('mimo');
    expect(state.asrLevels).toEqual(['doubao']);
    expect(state.currentASRLevel).toBe('doubao');
  });

  it('检测后分别选择 TTS/ASR 的首个能力并缓存', async () => {
    mockDetect.mockResolvedValue({
      tts: ['mimo', 'web'],
      asr: ['web', 'native', 'doubao'],
    });

    await useVoiceStore.getState().detect();
    await useVoiceStore.getState().detect();

    const state = useVoiceStore.getState();
    expect(state.currentTTSLevel).toBe('mimo');
    expect(state.currentASRLevel).toBe('web');
    expect(state.isDetected).toBe(true);
    expect(mockDetect).toHaveBeenCalledOnce();
  });

  it('TTS 只在显式失败后从 MiMo 降级到 Web', () => {
    useVoiceStore.setState({
      ttsLevels: ['mimo', 'web'] as never,
      currentTTSLevel: 'mimo' as never,
    });

    expect(useVoiceStore.getState().fallbackTTS()).toBe(true);
    expect(useVoiceStore.getState().currentTTSLevel).toBe('web');
    expect(useVoiceStore.getState().fallbackTTS()).toBe(false);
  });

  it('Task 5 前旧 ASR 仍可按既有顺序降级', () => {
    useVoiceStore.setState({
      asrLevels: ['web', 'native', 'doubao'],
      currentASRLevel: 'web',
    });

    expect(useVoiceStore.getState().fallbackASR()).toBe(true);
    expect(useVoiceStore.getState().currentASRLevel).toBe('native');
    expect(useVoiceStore.getState().fallbackASR()).toBe(true);
    expect(useVoiceStore.getState().currentASRLevel).toBe('doubao');
    expect(useVoiceStore.getState().fallbackASR()).toBe(false);
  });
});

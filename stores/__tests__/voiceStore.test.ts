import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useVoiceStore } from '../voiceStore';

// Mock voiceCapabilities.detect
vi.mock('@/lib/voiceCapabilities', () => ({
  detect: vi.fn(),
}));

import { detect } from '@/lib/voiceCapabilities';

const mockDetect = detect as ReturnType<typeof vi.fn>;

describe('voiceStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to initial state
    useVoiceStore.setState({
      ttsLevels: ['doubao'],
      asrLevels: ['doubao'],
      currentTTSLevel: 'doubao',
      currentASRLevel: 'doubao',
      isDetected: false,
    });
  });

  describe('initial state', () => {
    it('defaults to doubao for all levels', () => {
      const state = useVoiceStore.getState();
      expect(state.ttsLevels).toEqual(['doubao']);
      expect(state.asrLevels).toEqual(['doubao']);
      expect(state.currentTTSLevel).toBe('doubao');
      expect(state.currentASRLevel).toBe('doubao');
      expect(state.isDetected).toBe(false);
    });
  });

  describe('detect()', () => {
    it('runs detection and caches results', async () => {
      mockDetect.mockResolvedValue({
        tts: ['web', 'native', 'doubao'],
        asr: ['native', 'doubao'],
      });

      await useVoiceStore.getState().detect();

      const state = useVoiceStore.getState();
      expect(state.ttsLevels).toEqual(['web', 'native', 'doubao']);
      expect(state.asrLevels).toEqual(['native', 'doubao']);
      expect(state.currentTTSLevel).toBe('web');
      expect(state.currentASRLevel).toBe('native');
      expect(state.isDetected).toBe(true);
    });

    it('sets currentLevel to first available level', async () => {
      mockDetect.mockResolvedValue({
        tts: ['doubao'],
        asr: ['web', 'doubao'],
      });

      await useVoiceStore.getState().detect();

      const state = useVoiceStore.getState();
      expect(state.currentTTSLevel).toBe('doubao');
      expect(state.currentASRLevel).toBe('web');
    });

    it('skips detection if already detected', async () => {
      mockDetect.mockResolvedValue({
        tts: ['web', 'doubao'],
        asr: ['doubao'],
      });

      await useVoiceStore.getState().detect();
      expect(mockDetect).toHaveBeenCalledTimes(1);

      // Second call should be skipped
      await useVoiceStore.getState().detect();
      expect(mockDetect).toHaveBeenCalledTimes(1);
    });
  });

  describe('fallbackTTS()', () => {
    beforeEach(async () => {
      mockDetect.mockResolvedValue({
        tts: ['web', 'native', 'doubao'],
        asr: ['doubao'],
      });
      await useVoiceStore.getState().detect();
    });

    it('moves to next TTS level and returns true', () => {
      const result = useVoiceStore.getState().fallbackTTS();
      expect(result).toBe(true);
      expect(useVoiceStore.getState().currentTTSLevel).toBe('native');
    });

    it('can fallback through all levels', () => {
      useVoiceStore.getState().fallbackTTS(); // web → native
      expect(useVoiceStore.getState().currentTTSLevel).toBe('native');

      useVoiceStore.getState().fallbackTTS(); // native → doubao
      expect(useVoiceStore.getState().currentTTSLevel).toBe('doubao');
    });

    it('returns false when no more levels available', () => {
      useVoiceStore.getState().fallbackTTS(); // web → native
      useVoiceStore.getState().fallbackTTS(); // native → doubao

      const result = useVoiceStore.getState().fallbackTTS(); // no more
      expect(result).toBe(false);
      expect(useVoiceStore.getState().currentTTSLevel).toBe('doubao');
    });
  });

  describe('fallbackASR()', () => {
    beforeEach(async () => {
      mockDetect.mockResolvedValue({
        tts: ['doubao'],
        asr: ['web', 'native', 'doubao'],
      });
      await useVoiceStore.getState().detect();
    });

    it('moves to next ASR level and returns true', () => {
      const result = useVoiceStore.getState().fallbackASR();
      expect(result).toBe(true);
      expect(useVoiceStore.getState().currentASRLevel).toBe('native');
    });

    it('can fallback through all levels', () => {
      useVoiceStore.getState().fallbackASR(); // web → native
      useVoiceStore.getState().fallbackASR(); // native → doubao
      expect(useVoiceStore.getState().currentASRLevel).toBe('doubao');
    });

    it('returns false when no more levels available', () => {
      useVoiceStore.getState().fallbackASR(); // web → native
      useVoiceStore.getState().fallbackASR(); // native → doubao

      const result = useVoiceStore.getState().fallbackASR();
      expect(result).toBe(false);
      expect(useVoiceStore.getState().currentASRLevel).toBe('doubao');
    });
  });

  describe('fallback with only doubao', () => {
    beforeEach(async () => {
      mockDetect.mockResolvedValue({
        tts: ['doubao'],
        asr: ['doubao'],
      });
      await useVoiceStore.getState().detect();
    });

    it('fallbackTTS returns false immediately when only doubao available', () => {
      expect(useVoiceStore.getState().fallbackTTS()).toBe(false);
      expect(useVoiceStore.getState().currentTTSLevel).toBe('doubao');
    });

    it('fallbackASR returns false immediately when only doubao available', () => {
      expect(useVoiceStore.getState().fallbackASR()).toBe(false);
      expect(useVoiceStore.getState().currentASRLevel).toBe('doubao');
    });
  });
});

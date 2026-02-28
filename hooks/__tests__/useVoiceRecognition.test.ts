import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceStore } from '@/stores/voiceStore';

// ------ Mocks ------

vi.mock('@/lib/jsbridge', () => ({
  jsBridge: {
    nativeASR: {
      startRecognition: vi.fn(),
      stopRecognition: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(false),
    },
    nativeTTS: {
      isAvailable: vi.fn().mockResolvedValue(false),
    },
  },
}));

vi.mock('@/lib/voiceCapabilities', () => ({
  detect: vi.fn().mockResolvedValue({
    tts: ['doubao'],
    asr: ['web', 'native', 'doubao'],
  }),
}));

vi.mock('@/lib/api', () => ({
  fetchApi: vi.fn(),
  API_BASE_URL: 'http://localhost:8000',
}));

import { jsBridge } from '@/lib/jsbridge';
import { useVoiceRecognition } from '../useVoiceRecognition';

const mockStartRecognition = jsBridge.nativeASR
  .startRecognition as ReturnType<typeof vi.fn>;
const mockStopRecognition = jsBridge.nativeASR
  .stopRecognition as ReturnType<typeof vi.fn>;

// ------ Helpers ------

function resetVoiceStore(
  overrides?: Partial<ReturnType<typeof useVoiceStore.getState>>,
) {
  useVoiceStore.setState({
    ttsLevels: ['doubao'],
    asrLevels: ['web', 'native', 'doubao'],
    currentTTSLevel: 'doubao',
    currentASRLevel: 'web',
    isDetected: true,
    ...overrides,
  });
}

// Stub SpeechRecognition for Web Speech API tests
class MockSpeechRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((event: unknown) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onend: (() => void) | null = null;

  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
}

describe('useVoiceRecognition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetVoiceStore();
  });

  afterEach(() => {
    delete (window as unknown as Record<string, unknown>)['SpeechRecognition'];
    delete (window as unknown as Record<string, unknown>)[
      'webkitSpeechRecognition'
    ];
  });

  describe('initial state', () => {
    it('returns correct initial values', () => {
      const { result } = renderHook(() => useVoiceRecognition());

      expect(result.current.isListening).toBe(false);
      expect(result.current.transcript).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.currentLevel).toBe('web');
    });
  });

  describe('resetTranscript', () => {
    it('clears transcript and error', () => {
      const { result } = renderHook(() => useVoiceRecognition());

      act(() => {
        result.current.resetTranscript();
      });

      expect(result.current.transcript).toBe('');
      expect(result.current.error).toBeNull();
    });
  });

  describe('Web Speech API (level 1)', () => {
    it('starts listening with Web Speech API when available', async () => {
      let capturedInstance: MockSpeechRecognition | null = null;
      (window as unknown as Record<string, unknown>)['SpeechRecognition'] =
        class extends MockSpeechRecognition {
          constructor() {
            super();
            capturedInstance = this;
          }
        };

      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        await result.current.startListening();
      });

      expect(result.current.isListening).toBe(true);
      expect(capturedInstance).not.toBeNull();
      expect(capturedInstance!.start).toHaveBeenCalled();
      expect(capturedInstance!.lang).toBe('zh-CN');
      expect(capturedInstance!.continuous).toBe(true);
      expect(capturedInstance!.interimResults).toBe(true);
    });

    it('stops Web Speech API recognition', async () => {
      let capturedInstance: MockSpeechRecognition | null = null;
      (window as unknown as Record<string, unknown>)['SpeechRecognition'] =
        class extends MockSpeechRecognition {
          constructor() {
            super();
            capturedInstance = this;
          }
        };

      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        await result.current.startListening();
      });

      act(() => {
        result.current.stopListening();
      });

      expect(result.current.isListening).toBe(false);
      expect(capturedInstance!.stop).toHaveBeenCalled();
    });
  });

  describe('Native ASR (level 2)', () => {
    it('uses native ASR when currentLevel is native', async () => {
      resetVoiceStore({
        asrLevels: ['native', 'doubao'],
        currentASRLevel: 'native',
      });

      mockStartRecognition.mockResolvedValue('你好世界');

      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        await result.current.startListening();
      });

      expect(mockStartRecognition).toHaveBeenCalledWith({
        language: 'zh-CN',
      });
      expect(result.current.transcript).toBe('你好世界');
    });
  });

  describe('auto-fallback', () => {
    it('falls back from web to native when web is unavailable', async () => {
      // Web Speech API not available (no constructor on window)
      resetVoiceStore({
        asrLevels: ['web', 'native', 'doubao'],
        currentASRLevel: 'web',
      });

      mockStartRecognition.mockResolvedValue('降级成功');

      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        await result.current.startListening();
      });

      // Should have fallen back to native
      expect(mockStartRecognition).toHaveBeenCalled();
      expect(result.current.transcript).toBe('降级成功');
    });

    it('logs fallback events with console.warn', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      resetVoiceStore({
        asrLevels: ['web', 'native', 'doubao'],
        currentASRLevel: 'web',
      });

      mockStartRecognition.mockResolvedValue('ok');

      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        await result.current.startListening();
      });

      // Should have logged fallback from web to native
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[useVoiceRecognition]'),
      );

      warnSpy.mockRestore();
    });

    it('sets error when all levels fail and no more fallback', async () => {
      resetVoiceStore({
        asrLevels: ['doubao'],
        currentASRLevel: 'doubao',
      });

      // Mock getUserMedia to fail for doubao
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi
            .fn()
            .mockRejectedValue(new Error('无麦克风')),
        },
        writable: true,
        configurable: true,
      });

      const { result } = renderHook(() => useVoiceRecognition());

      await act(async () => {
        await result.current.startListening();
      });

      expect(result.current.isListening).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe('stopListening', () => {
    it('calls jsBridge.nativeASR.stopRecognition and sets isListening false', () => {
      const { result } = renderHook(() => useVoiceRecognition());

      act(() => {
        result.current.stopListening();
      });

      expect(mockStopRecognition).toHaveBeenCalled();
      expect(result.current.isListening).toBe(false);
    });
  });

  describe('currentLevel reflects voiceStore', () => {
    it('returns the current ASR level from voiceStore', () => {
      resetVoiceStore({ currentASRLevel: 'native' });

      const { result } = renderHook(() => useVoiceRecognition());
      expect(result.current.currentLevel).toBe('native');
    });

    it('returns doubao when only doubao is available', () => {
      resetVoiceStore({
        asrLevels: ['doubao'],
        currentASRLevel: 'doubao',
      });

      const { result } = renderHook(() => useVoiceRecognition());
      expect(result.current.currentLevel).toBe('doubao');
    });
  });
});

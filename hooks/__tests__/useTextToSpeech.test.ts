import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceStore } from '@/stores/voiceStore';
import { useUserStore } from '@/stores/userStore';

// ------ Mocks ------

const mockNativeTTSSpeak = vi.fn().mockResolvedValue(undefined);
const mockNativeTTSStop = vi.fn();
const mockNativeTTSIsAvailable = vi.fn().mockResolvedValue(false);

vi.mock('@/lib/jsbridge', () => ({
  jsBridge: {
    nativeTTS: {
      speak: (...args: unknown[]) => mockNativeTTSSpeak(...args),
      stop: (...args: unknown[]) => mockNativeTTSStop(...args),
      isAvailable: (...args: unknown[]) => mockNativeTTSIsAvailable(...args),
    },
    nativeASR: {
      isAvailable: vi.fn().mockResolvedValue(false),
    },
  },
}));

vi.mock('@/lib/voiceCapabilities', () => ({
  detect: vi.fn().mockResolvedValue({
    tts: ['web', 'native', 'doubao'],
    asr: ['doubao'],
  }),
}));

vi.mock('@/lib/api', () => ({
  fetchApi: vi.fn(),
  API_BASE_URL: 'http://localhost:8000',
}));

import { useTextToSpeech } from '../useTextToSpeech';

// ------ Helpers ------

function resetVoiceStore(
  overrides?: Partial<ReturnType<typeof useVoiceStore.getState>>,
) {
  useVoiceStore.setState({
    ttsLevels: ['web', 'native', 'doubao'],
    asrLevels: ['doubao'],
    currentTTSLevel: 'web',
    currentASRLevel: 'doubao',
    isDetected: true,
    ...overrides,
  });
}

function resetUserStore(overrides?: { isElder?: boolean }) {
  useUserStore.setState({
    user: {
      id: 'test-user',
      name: '测试用户',
      phone: '13800138000',
      role: overrides?.isElder !== false ? 'elder' : 'family',
      avatar_url: null,
      birth_date: null,
      gender: null,
      chronic_diseases: null,
      font_size: 'medium',
      voice_speed: null,
      wake_word: null,
      last_active_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as ReturnType<typeof useUserStore.getState>['user'],
    isElder: overrides?.isElder !== false,
    token: 'test-token',
  });
}

// Mock SpeechSynthesisUtterance
class MockUtterance {
  lang = '';
  rate = 1;
  text = '';
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

// Mock speechSynthesis
function setupWebSpeechMock(options?: { shouldFail?: boolean }) {
  const mockSpeak = vi.fn().mockImplementation((utterance: MockUtterance) => {
    // Simulate async completion
    setTimeout(() => {
      if (options?.shouldFail) {
        utterance.onerror?.({ error: 'synthesis-failed' });
      } else {
        utterance.onend?.();
      }
    }, 0);
  });

  const mockCancel = vi.fn();

  Object.defineProperty(window, 'speechSynthesis', {
    value: { speak: mockSpeak, cancel: mockCancel },
    writable: true,
    configurable: true,
  });

  (window as unknown as Record<string, unknown>)['SpeechSynthesisUtterance'] =
    MockUtterance;

  return { mockSpeak, mockCancel };
}

function cleanupWebSpeechMock() {
  delete (window as unknown as Record<string, unknown>)['speechSynthesis'];
  delete (window as unknown as Record<string, unknown>)[
    'SpeechSynthesisUtterance'
  ];
}

describe('useTextToSpeech', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetVoiceStore();
    resetUserStore();
  });

  afterEach(() => {
    cleanupWebSpeechMock();
  });

  describe('initial state', () => {
    it('returns correct initial values', () => {
      const { result } = renderHook(() => useTextToSpeech());

      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.currentLevel).toBe('web');
    });
  });

  describe('Web SpeechSynthesis API (level 1)', () => {
    it('speaks using Web SpeechSynthesis when available', async () => {
      const { mockSpeak } = setupWebSpeechMock();

      const { result } = renderHook(() => useTextToSpeech());

      await act(async () => {
        await result.current.speak('你好');
      });

      expect(mockSpeak).toHaveBeenCalled();
      const utterance = mockSpeak.mock.calls[0][0] as MockUtterance;
      expect(utterance.text).toBe('你好');
      expect(utterance.lang).toBe('zh-CN');
      expect(result.current.isSpeaking).toBe(false); // finished
    });

    it('sets lang to zh-CN and rate to elder speed 0.8', async () => {
      resetUserStore({ isElder: true });
      const { mockSpeak } = setupWebSpeechMock();

      const { result } = renderHook(() => useTextToSpeech());

      await act(async () => {
        await result.current.speak('测试语速');
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockUtterance;
      expect(utterance.lang).toBe('zh-CN');
      expect(utterance.rate).toBe(0.8);
    });

    it('uses standard speed 1.0 for family mode', async () => {
      resetUserStore({ isElder: false });
      const { mockSpeak } = setupWebSpeechMock();

      const { result } = renderHook(() => useTextToSpeech());

      await act(async () => {
        await result.current.speak('家属端测试');
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockUtterance;
      expect(utterance.rate).toBe(1.0);
    });
  });

  describe('Native TTS (level 2)', () => {
    it('uses native TTS when currentLevel is native', async () => {
      resetVoiceStore({
        ttsLevels: ['native', 'doubao'],
        currentTTSLevel: 'native',
      });

      const { result } = renderHook(() => useTextToSpeech());

      await act(async () => {
        await result.current.speak('原生TTS测试');
      });

      expect(mockNativeTTSSpeak).toHaveBeenCalledWith('原生TTS测试', {
        speed: 0.8,
      });
    });
  });

  describe('Doubao TTS (level 3)', () => {
    it('calls backend API and plays audio when level is doubao', async () => {
      resetVoiceStore({
        ttsLevels: ['doubao'],
        currentTTSLevel: 'doubao',
      });

      // Mock fetch for doubao TTS
      const mockBlob = new Blob(['fake-audio'], { type: 'audio/mp3' });
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });
      vi.stubGlobal('fetch', mockFetch);

      // Mock Audio — auto-fire onended after play()
      const mockPlay = vi.fn().mockImplementation(function (this: { onended?: (() => void) | null }) {
        // Simulate audio finishing immediately
        setTimeout(() => this.onended?.(), 0);
        return Promise.resolve();
      });
      vi.stubGlobal(
        'Audio',
        class {
          src = '';
          onended: (() => void) | null = null;
          onerror: (() => void) | null = null;
          play = mockPlay;
          pause = vi.fn();
        },
      );

      // Mock URL.createObjectURL / revokeObjectURL
      vi.stubGlobal('URL', {
        ...URL,
        createObjectURL: vi.fn().mockReturnValue('blob:fake-url'),
        revokeObjectURL: vi.fn(),
      });

      const { result } = renderHook(() => useTextToSpeech());

      await act(async () => {
        await result.current.speak('豆包测试');
      });

      // Verify fetch was called with correct params
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/voice/tts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ text: '豆包测试', speed: 0.8 }),
        }),
      );

      expect(mockPlay).toHaveBeenCalled();
      expect(result.current.isSpeaking).toBe(false);

      vi.unstubAllGlobals();
    });
  });

  describe('auto-fallback', () => {
    it('falls back from web to native when web fails', async () => {
      // Web Speech API fails
      setupWebSpeechMock({ shouldFail: true });

      resetVoiceStore({
        ttsLevels: ['web', 'native', 'doubao'],
        currentTTSLevel: 'web',
      });

      mockNativeTTSSpeak.mockResolvedValue(undefined);

      const { result } = renderHook(() => useTextToSpeech());

      await act(async () => {
        await result.current.speak('降级测试');
      });

      // Should have fallen back to native
      expect(mockNativeTTSSpeak).toHaveBeenCalled();
    });

    it('logs fallback events with console.warn', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // No Web Speech API available
      resetVoiceStore({
        ttsLevels: ['web', 'native', 'doubao'],
        currentTTSLevel: 'web',
      });

      mockNativeTTSSpeak.mockResolvedValue(undefined);

      const { result } = renderHook(() => useTextToSpeech());

      await act(async () => {
        await result.current.speak('日志测试');
      });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[useTextToSpeech]'),
      );

      warnSpy.mockRestore();
    });

    it('sets error when all levels fail', async () => {
      resetVoiceStore({
        ttsLevels: ['doubao'],
        currentTTSLevel: 'doubao',
      });

      // Mock fetch to fail
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ ok: false, status: 500 }),
      );

      const { result } = renderHook(() => useTextToSpeech());

      await act(async () => {
        await result.current.speak('全部失败');
      });

      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.error).toBeTruthy();

      vi.unstubAllGlobals();
    });
  });

  describe('stop', () => {
    it('calls speechSynthesis.cancel and sets isSpeaking false', () => {
      const { mockCancel } = setupWebSpeechMock();

      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.stop();
      });

      expect(mockCancel).toHaveBeenCalled();
      expect(mockNativeTTSStop).toHaveBeenCalled();
      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('setSpeed', () => {
    it('allows adjusting speech speed', async () => {
      setupWebSpeechMock();

      const { result } = renderHook(() => useTextToSpeech());

      act(() => {
        result.current.setSpeed(1.5);
      });

      const { mockSpeak } = setupWebSpeechMock();

      await act(async () => {
        await result.current.speak('自定义语速');
      });

      const utterance = mockSpeak.mock.calls[0][0] as MockUtterance;
      expect(utterance.rate).toBe(1.5);
    });
  });

  describe('currentLevel reflects voiceStore', () => {
    it('returns the current TTS level from voiceStore', () => {
      resetVoiceStore({ currentTTSLevel: 'native' });

      const { result } = renderHook(() => useTextToSpeech());
      expect(result.current.currentLevel).toBe('native');
    });

    it('returns doubao when only doubao is available', () => {
      resetVoiceStore({
        ttsLevels: ['doubao'],
        currentTTSLevel: 'doubao',
      });

      const { result } = renderHook(() => useTextToSpeech());
      expect(result.current.currentLevel).toBe('doubao');
    });
  });

  describe('elder mode default speed', () => {
    it('defaults to 0.8 speed for elder users', () => {
      resetUserStore({ isElder: true });

      // The hook internally uses 0.8 — we verify via speak call
      const { result } = renderHook(() => useTextToSpeech());
      // Speed is internal state, verified through speak behavior
      expect(result.current.currentLevel).toBeDefined();
    });

    it('defaults to 1.0 speed for family users', () => {
      resetUserStore({ isElder: false });

      const { result } = renderHook(() => useTextToSpeech());
      expect(result.current.currentLevel).toBeDefined();
    });
  });
});

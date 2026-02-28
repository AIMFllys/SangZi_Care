import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detect, type VoiceLevel } from '../voiceCapabilities';

// Mock jsBridge
vi.mock('@/lib/jsbridge', () => ({
  jsBridge: {
    nativeTTS: { isAvailable: vi.fn() },
    nativeASR: { isAvailable: vi.fn() },
  },
}));

import { jsBridge } from '@/lib/jsbridge';

const mockNativeTTS = jsBridge.nativeTTS.isAvailable as ReturnType<typeof vi.fn>;
const mockNativeASR = jsBridge.nativeASR.isAvailable as ReturnType<typeof vi.fn>;

describe('voiceCapabilities.detect()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: native not available
    mockNativeTTS.mockResolvedValue(false);
    mockNativeASR.mockResolvedValue(false);
  });

  afterEach(() => {
    // Clean up Web Speech API mocks
    delete (window as unknown as Record<string, unknown>)['speechSynthesis'];
    delete (window as unknown as Record<string, unknown>)['SpeechRecognition'];
    delete (window as unknown as Record<string, unknown>)['webkitSpeechRecognition'];
  });

  it('returns only doubao when no web or native capabilities exist', async () => {
    const result = await detect();
    expect(result.tts).toEqual(['doubao']);
    expect(result.asr).toEqual(['doubao']);
  });

  it('includes web TTS when speechSynthesis is available', async () => {
    (window as unknown as Record<string, unknown>)['speechSynthesis'] = {};

    const result = await detect();
    expect(result.tts).toEqual(['web', 'doubao']);
    expect(result.asr).toEqual(['doubao']); // ASR still not available
  });

  it('includes web ASR when SpeechRecognition is available', async () => {
    (window as unknown as Record<string, unknown>)['SpeechRecognition'] = class {};

    const result = await detect();
    expect(result.tts).toEqual(['doubao']);
    expect(result.asr).toEqual(['web', 'doubao']);
  });

  it('includes web ASR when webkitSpeechRecognition is available', async () => {
    (window as unknown as Record<string, unknown>)['webkitSpeechRecognition'] = class {};

    const result = await detect();
    expect(result.asr).toEqual(['web', 'doubao']);
  });

  it('includes native TTS when JSBridge reports available', async () => {
    mockNativeTTS.mockResolvedValue(true);

    const result = await detect();
    expect(result.tts).toEqual(['native', 'doubao']);
  });

  it('includes native ASR when JSBridge reports available', async () => {
    mockNativeASR.mockResolvedValue(true);

    const result = await detect();
    expect(result.asr).toEqual(['native', 'doubao']);
  });

  it('returns all three levels when everything is available', async () => {
    (window as unknown as Record<string, unknown>)['speechSynthesis'] = {};
    (window as unknown as Record<string, unknown>)['SpeechRecognition'] = class {};
    mockNativeTTS.mockResolvedValue(true);
    mockNativeASR.mockResolvedValue(true);

    const result = await detect();
    expect(result.tts).toEqual(['web', 'native', 'doubao']);
    expect(result.asr).toEqual(['web', 'native', 'doubao']);
  });

  it('maintains priority order: web > native > doubao', async () => {
    (window as unknown as Record<string, unknown>)['speechSynthesis'] = {};
    mockNativeTTS.mockResolvedValue(true);

    const result = await detect();
    const webIdx = result.tts.indexOf('web');
    const nativeIdx = result.tts.indexOf('native');
    const doubaoIdx = result.tts.indexOf('doubao');
    expect(webIdx).toBeLessThan(nativeIdx);
    expect(nativeIdx).toBeLessThan(doubaoIdx);
  });

  it('doubao is always the last element in both arrays', async () => {
    mockNativeTTS.mockResolvedValue(true);
    mockNativeASR.mockResolvedValue(true);

    const result = await detect();
    expect(result.tts[result.tts.length - 1]).toBe('doubao');
    expect(result.asr[result.asr.length - 1]).toBe('doubao');
  });

  it('handles native check rejection gracefully', async () => {
    mockNativeTTS.mockRejectedValue(new Error('bridge error'));
    mockNativeASR.mockRejectedValue(new Error('bridge error'));

    const result = await detect();
    expect(result.tts).toEqual(['doubao']);
    expect(result.asr).toEqual(['doubao']);
  });
});

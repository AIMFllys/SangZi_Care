import { afterEach, describe, expect, it } from 'vitest';
import { detect } from '../voiceCapabilities';

describe('voiceCapabilities.detect final MiMo policy', () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).speechSynthesis;
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  });

  it('没有浏览器语音 API 时只公开 MiMo', async () => {
    await expect(detect()).resolves.toEqual({
      tts: ['mimo'],
      asr: ['mimo'],
    });
  });

  it('浏览器 TTS 仅排在 MiMo 之后', async () => {
    (window as unknown as Record<string, unknown>).speechSynthesis = {};

    const result = await detect();

    expect(result.tts).toEqual(['mimo', 'web']);
    expect(result.asr).toEqual(['mimo']);
  });

  it('标准或 webkit ASR 仅排在 MiMo 之后', async () => {
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = class { };

    const result = await detect();

    expect(result.asr).toEqual(['mimo', 'web']);
    expect(result.tts).toEqual(['mimo']);
  });
});

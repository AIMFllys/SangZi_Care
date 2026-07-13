'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchBlob } from '@/lib/api';
import type { VoiceLevel } from '@/lib/voiceCapabilities';
import { useUserStore } from '@/stores/userStore';
import { useVoiceStore } from '@/stores/voiceStore';

const MAX_TTS_CODE_POINTS = 1_000;
const ELDER_DEFAULT_SPEED = 0.8;
const DEFAULT_SPEED = 1;
const MIN_SPEED = 0.5;
const MAX_SPEED = 2;
const SENTENCE_BOUNDARIES = new Set(['。', '！', '？', '；', '\n']);

interface SpeechOperation {
  readonly id: number;
  readonly controller: AbortController;
  cancelled: boolean;
  cancelMedia: (() => void) | null;
}

export interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  error: string | null;
  currentLevel: VoiceLevel;
  speak: (text: string) => Promise<void>;
  stop: () => void;
  setSpeed: (speed: number) => void;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function clampSpeed(value: number): number {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, value));
}

function resolvePlaybackRate(
  override: number | null,
  preference: number | null | undefined,
  isElder: boolean,
): number {
  const roleDefault = isElder ? ELDER_DEFAULT_SPEED : DEFAULT_SPEED;
  const candidate = override ?? preference;
  return clampSpeed(
    typeof candidate === 'number' && Number.isFinite(candidate)
      ? candidate
      : roleDefault,
  );
}

function splitTtsText(text: string): string[] {
  let remaining = Array.from(text.trim());
  const chunks: string[] = [];

  while (remaining.length > MAX_TTS_CODE_POINTS) {
    let cut = MAX_TTS_CODE_POINTS;
    for (let index = MAX_TTS_CODE_POINTS - 1; index >= 0; index -= 1) {
      if (SENTENCE_BOUNDARIES.has(remaining[index])) {
        cut = index + 1;
        break;
      }
    }

    const chunk = remaining.slice(0, cut).join('').trim();
    if (chunk) chunks.push(chunk);
    remaining = remaining.slice(cut);
  }

  const tail = remaining.join('').trim();
  if (tail) chunks.push(tail);
  return chunks;
}

function playAudioBlob(
  operation: SpeechOperation,
  blob: Blob,
  playbackRate: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const audio = new Audio(objectUrl);
    let settled = false;
    let revoked = false;

    const release = (pause: boolean): void => {
      audio.onended = null;
      audio.onerror = null;
      if (pause) {
        try {
          audio.pause();
        } catch {
          // 浏览器可能已销毁媒体对象，继续完成资源回收。
        }
      }
      audio.src = '';
      if (!revoked) {
        revoked = true;
        URL.revokeObjectURL(objectUrl);
      }
      if (operation.cancelMedia === cancelPlayback) {
        operation.cancelMedia = null;
      }
    };

    const finish = (
      outcome: 'ended' | 'cancelled' | 'error',
      cause?: unknown,
    ): void => {
      if (settled) return;
      settled = true;
      release(outcome !== 'ended');
      if (outcome === 'error') {
        reject(cause instanceof Error ? cause : new Error('MiMo 音频播放失败'));
      } else {
        resolve();
      }
    };

    const cancelPlayback = (): void => finish('cancelled');
    operation.cancelMedia = cancelPlayback;
    audio.playbackRate = playbackRate;
    audio.onended = () => finish('ended');
    audio.onerror = () => finish('error', new Error('MiMo 音频播放失败'));

    audio.play().catch((cause: unknown) => finish('error', cause));
  });
}

function playWebSpeech(
  operation: SpeechOperation,
  text: string,
  playbackRate: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('浏览器语音合成不可用'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    let settled = false;
    const release = (): void => {
      utterance.onend = null;
      utterance.onerror = null;
      if (operation.cancelMedia === cancelSpeech) operation.cancelMedia = null;
    };
    const finish = (
      outcome: 'ended' | 'cancelled' | 'error',
      message?: string,
    ): void => {
      if (settled) return;
      settled = true;
      release();
      if (outcome === 'error') reject(new Error(message ?? '浏览器语音播放失败'));
      else resolve();
    };
    const cancelSpeech = (): void => {
      window.speechSynthesis.cancel();
      finish('cancelled');
    };

    operation.cancelMedia = cancelSpeech;
    utterance.lang = 'zh-CN';
    utterance.rate = playbackRate;
    utterance.onend = () => finish('ended');
    utterance.onerror = (event) => {
      if (event.error === 'canceled') finish('cancelled');
      else finish('error', `浏览器语音播放失败：${event.error}`);
    };
    window.speechSynthesis.speak(utterance);
  });
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const {
    currentTTSLevel,
    fallbackTTS,
    isDetected,
    detect,
  } = useVoiceStore();
  const isElder = useUserStore((state) => state.isElder);
  const voiceSpeed = useUserStore((state) => state.user?.voice_speed);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speedOverride, setSpeedOverride] = useState<number | null>(null);
  const operationRef = useRef<SpeechOperation | null>(null);
  const operationIdRef = useRef(0);
  const mountedRef = useRef(true);

  const cancelOperation = useCallback((operation: SpeechOperation): void => {
    if (operation.cancelled) return;
    operation.cancelled = true;
    operation.controller.abort();
    operation.cancelMedia?.();
    operation.cancelMedia = null;
  }, []);

  const stop = useCallback((): void => {
    const operation = operationRef.current;
    if (!operation) return;
    cancelOperation(operation);
    if (operationRef.current === operation) operationRef.current = null;
    if (mountedRef.current) setIsSpeaking(false);
  }, [cancelOperation]);

  const speak = useCallback(async (text: string): Promise<void> => {
    const chunks = splitTtsText(text);
    if (chunks.length === 0) return;

    const previous = operationRef.current;
    if (previous) cancelOperation(previous);

    const operation: SpeechOperation = {
      id: ++operationIdRef.current,
      controller: new AbortController(),
      cancelled: false,
      cancelMedia: null,
    };
    operationRef.current = operation;
    if (mountedRef.current) {
      setError(null);
      setIsSpeaking(true);
    }

    try {
      if (!isDetected) await detect();
      if (operation.cancelled) return;

      const playbackRate = resolvePlaybackRate(
        speedOverride,
        voiceSpeed,
        isElder,
      );
      let level = useVoiceStore.getState().currentTTSLevel;

      for (const chunk of chunks) {
        if (operation.cancelled) return;

        if (level === 'web') {
          await playWebSpeech(operation, chunk, playbackRate);
          continue;
        }

        try {
          const blob = await fetchBlob('/api/v1/voice/tts', {
            method: 'POST',
            body: { text: chunk },
            signal: operation.controller.signal,
          });
          if (operation.cancelled) return;
          await playAudioBlob(operation, blob, playbackRate);
        } catch (cause) {
          if (operation.cancelled || isAbortError(cause)) return;

          const didFallback = fallbackTTS();
          const nextLevel = useVoiceStore.getState().currentTTSLevel;
          if (didFallback && nextLevel === 'web') {
            level = 'web';
            await playWebSpeech(operation, chunk, playbackRate);
            continue;
          }
          throw cause;
        }
      }
    } catch (cause) {
      if (!operation.cancelled && mountedRef.current) {
        const message = cause instanceof Error ? cause.message : '未知错误';
        setError(`语音播放失败：${message}`);
      }
    } finally {
      if (operationRef.current === operation) {
        operationRef.current = null;
        if (mountedRef.current) setIsSpeaking(false);
      }
    }
  }, [
    cancelOperation,
    detect,
    fallbackTTS,
    isDetected,
    isElder,
    speedOverride,
    voiceSpeed,
  ]);

  const setSpeed = useCallback((speed: number): void => {
    setSpeedOverride(Number.isFinite(speed) ? clampSpeed(speed) : null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const operation = operationRef.current;
      if (operation) cancelOperation(operation);
      operationRef.current = null;
    };
  }, [cancelOperation]);

  return {
    isSpeaking,
    error,
    currentLevel: currentTTSLevel,
    speak,
    stop,
    setSpeed,
  };
}

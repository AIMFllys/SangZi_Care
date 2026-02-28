'use client';

// ============================================================
// 桑梓智护 — 语音合成 Hook（三级降级）
// SpeechSynthesis API → JSBridge Android TTS → 豆包 TTS
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoiceStore } from '@/stores/voiceStore';
import { useUserStore } from '@/stores/userStore';
import { jsBridge } from '@/lib/jsbridge';
import { API_BASE_URL } from '@/lib/api';
import type { VoiceLevel } from '@/lib/voiceCapabilities';

export interface UseTextToSpeechReturn {
  /** 是否正在播放语音 */
  isSpeaking: boolean;
  /** 错误信息 */
  error: string | null;
  /** 当前使用的 TTS 级别 */
  currentLevel: VoiceLevel;
  /** 播放语音 */
  speak: (text: string) => Promise<void>;
  /** 停止播放 */
  stop: () => void;
  /** 调整语速 */
  setSpeed: (speed: number) => void;
}

/** 老年人端默认语速 */
const ELDER_DEFAULT_SPEED = 0.8;
/** 标准默认语速 */
const DEFAULT_SPEED = 1.0;

// ------ Level 1: Web SpeechSynthesis API ------

function speakWithWebAPI(text: string, speed: number): Promise<SpeechSynthesisUtterance> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      reject(new Error('SpeechSynthesis API 不可用'));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = speed;

    utterance.onend = () => resolve(utterance);
    utterance.onerror = (event) => {
      // 'canceled' is expected when we call cancel()
      if (event.error === 'canceled') {
        resolve(utterance);
        return;
      }
      reject(new Error(`SpeechSynthesis 错误: ${event.error}`));
    };

    window.speechSynthesis.speak(utterance);
  });
}

// ------ Level 2: Native TTS (JSBridge) ------

async function speakWithNativeTTS(text: string, speed: number): Promise<void> {
  await jsBridge.nativeTTS.speak(text, { speed });
}

// ------ Level 3: 豆包 TTS (后端 API → Audio 播放) ------

async function speakWithDoubaoTTS(
  text: string,
  speed: number,
  audioRef: React.MutableRefObject<HTMLAudioElement | null>,
): Promise<void> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/v1/voice/tts`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, speed }),
  });

  if (!res.ok) {
    throw new Error(`豆包 TTS 请求失败 (${res.status})`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  return new Promise<void>((resolve, reject) => {
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      audioRef.current = null;
      resolve();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      audioRef.current = null;
      reject(new Error('豆包 TTS 音频播放失败'));
    };

    audio.play().catch((err) => {
      URL.revokeObjectURL(url);
      audioRef.current = null;
      reject(err instanceof Error ? err : new Error('音频播放失败'));
    });
  });
}

// ------ Hook 实现 ------

export function useTextToSpeech(): UseTextToSpeechReturn {
  const { currentTTSLevel, fallbackTTS, isDetected, detect } = useVoiceStore();
  const isElder = useUserStore((s) => s.isElder);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeedState] = useState<number>(
    isElder ? ELDER_DEFAULT_SPEED : DEFAULT_SPEED,
  );

  // Refs for cleanup
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isCancelledRef = useRef(false);

  // Sync speed when elder mode changes
  useEffect(() => {
    setSpeedState(isElder ? ELDER_DEFAULT_SPEED : DEFAULT_SPEED);
  }, [isElder]);

  // ------ Cleanup helpers ------

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = '';
      } catch {
        // ignore
      }
      audioRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    isCancelledRef.current = true;

    // Stop Web SpeechSynthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Stop Native TTS
    jsBridge.nativeTTS.stop();

    // Stop Audio element (doubao)
    cleanupAudio();

    setIsSpeaking(false);
  }, [cleanupAudio]);

  // ------ 带降级的播放逻辑 ------

  const speakWithLevel = useCallback(
    async (text: string, level: VoiceLevel, currentSpeed: number): Promise<void> => {
      try {
        switch (level) {
          case 'web':
            await speakWithWebAPI(text, currentSpeed);
            break;
          case 'native':
            await speakWithNativeTTS(text, currentSpeed);
            break;
          case 'doubao':
            await speakWithDoubaoTTS(text, currentSpeed, audioRef);
            break;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '语音合成失败';
        console.warn(
          `[useTextToSpeech] ${level} 级别失败，尝试降级: ${message}`,
        );

        // 尝试降级
        const didFallback = fallbackTTS();
        if (didFallback) {
          const nextLevel = useVoiceStore.getState().currentTTSLevel;
          console.warn(
            `[useTextToSpeech] 降级: ${level} → ${nextLevel}`,
          );
          await speakWithLevel(text, nextLevel, currentSpeed);
        } else {
          // 所有级别都失败
          throw new Error(`所有 TTS 级别均不可用: ${message}`);
        }
      }
    },
    [fallbackTTS],
  );

  // ------ Public API ------

  const speak = useCallback(
    async (text: string): Promise<void> => {
      // 确保已检测能力
      if (!isDetected) {
        await detect();
      }

      // 停止当前播放
      stopAll();
      setError(null);
      isCancelledRef.current = false;
      setIsSpeaking(true);

      const level = useVoiceStore.getState().currentTTSLevel;

      try {
        await speakWithLevel(text, level, speed);
        // 播放完成后检查是否被取消
        if (!isCancelledRef.current) {
          setIsSpeaking(false);
        }
      } catch (err) {
        if (!isCancelledRef.current) {
          const message = err instanceof Error ? err.message : '语音合成失败';
          setError(message);
          setIsSpeaking(false);
        }
      }
    },
    [isDetected, detect, stopAll, speakWithLevel, speed],
  );

  const stop = useCallback(() => {
    stopAll();
  }, [stopAll]);

  const setSpeed = useCallback((newSpeed: number) => {
    setSpeedState(newSpeed);
  }, []);

  // ------ Cleanup on unmount ------

  useEffect(() => {
    return () => {
      // Cancel speech on unmount
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      jsBridge.nativeTTS.stop();
      cleanupAudio();
    };
  }, [cleanupAudio]);

  return {
    isSpeaking,
    error,
    currentLevel: currentTTSLevel,
    speak,
    stop,
    setSpeed,
  };
}

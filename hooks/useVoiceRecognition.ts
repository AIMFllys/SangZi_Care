'use client';

// ============================================================
// 桑梓智护 — 语音识别 Hook（三级降级）
// Web Speech API → JSBridge Android ASR → 豆包流式 ASR
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoiceStore } from '@/stores/voiceStore';
import { jsBridge } from '@/lib/jsbridge';
import { fetchApi, API_BASE_URL } from '@/lib/api';
import type { VoiceLevel } from '@/lib/voiceCapabilities';

export interface UseVoiceRecognitionReturn {
  /** 是否正在录音/识别 */
  isListening: boolean;
  /** 当前识别文本（中间结果或最终结果） */
  transcript: string;
  /** 错误信息 */
  error: string | null;
  /** 当前使用的 ASR 级别 */
  currentLevel: VoiceLevel;
  /** 开始识别 */
  startListening: () => Promise<void>;
  /** 停止识别 */
  stopListening: () => void;
  /** 清空识别文本 */
  resetTranscript: () => void;
}

// ------ Web Speech API 类型补丁 ------

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

// ------ Level 1: Web Speech API ------

function createWebSpeechRecognition(): SpeechRecognitionInstance | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = 'zh-CN';
  recognition.continuous = true;
  recognition.interimResults = true;
  return recognition;
}

// ------ Level 3: 豆包 ASR (POST file upload) ------

async function doubaoTranscribe(audioBlob: Blob): Promise<string> {
  // Use FormData for file upload — bypass the JSON fetchApi
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');

  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/v1/voice/transcribe`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`豆包 ASR 请求失败 (${res.status})`);
  }

  const data = (await res.json()) as { text?: string };
  return data.text ?? '';
}

// ------ MediaRecorder helper (for doubao fallback) ------

function createMediaRecorder(
  stream: MediaStream,
  onData: (blob: Blob) => void,
): MediaRecorder {
  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm',
  });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: recorder.mimeType });
    onData(blob);
  };

  return recorder;
}

// ------ Hook 实现 ------

export function useVoiceRecognition(): UseVoiceRecognitionReturn {
  const { currentASRLevel, fallbackASR, isDetected, detect } =
    useVoiceStore();

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Refs for cleanup
  const webRecognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isStoppedRef = useRef(false);

  // ------ Cleanup helpers ------

  const cleanupWebSpeech = useCallback(() => {
    if (webRecognitionRef.current) {
      try {
        webRecognitionRef.current.onresult = null;
        webRecognitionRef.current.onerror = null;
        webRecognitionRef.current.onend = null;
        webRecognitionRef.current.abort();
      } catch {
        // ignore
      }
      webRecognitionRef.current = null;
    }
  }, []);

  const cleanupMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const cleanupAll = useCallback(() => {
    cleanupWebSpeech();
    cleanupMediaRecorder();
  }, [cleanupWebSpeech, cleanupMediaRecorder]);

  // ------ Level 1: Web Speech API ------

  const startWebSpeech = useCallback((): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const recognition = createWebSpeechRecognition();
      if (!recognition) {
        reject(new Error('Web Speech API 不可用'));
        return;
      }

      webRecognitionRef.current = recognition;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalText += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }
        // Append final text, show interim as current
        if (finalText) {
          setTranscript((prev) => prev + finalText);
        } else if (interimText) {
          setTranscript((prev) => {
            // Replace only the interim portion
            const base = prev;
            return base + interimText;
          });
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // 'aborted' is expected when we call stop()
        if (event.error === 'aborted') return;
        cleanupWebSpeech();
        setIsListening(false);
        reject(new Error(`Web Speech API 错误: ${event.error}`));
      };

      recognition.onend = () => {
        // If user didn't explicitly stop, this is an unexpected end
        if (!isStoppedRef.current) {
          setIsListening(false);
        }
      };

      try {
        recognition.start();
        resolve();
      } catch (err) {
        reject(
          err instanceof Error ? err : new Error('Web Speech API 启动失败'),
        );
      }
    });
  }, [cleanupWebSpeech]);

  // ------ Level 2: Native ASR (JSBridge) ------

  const startNativeASR = useCallback(async (): Promise<void> => {
    const text = await jsBridge.nativeASR.startRecognition({
      language: 'zh-CN',
    });
    if (text) {
      setTranscript((prev) => prev + text);
    }
  }, []);

  // ------ Level 3: 豆包 ASR (录音 + 上传) ------

  const startDoubaoASR = useCallback((): Promise<void> => {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaStreamRef.current = stream;

        const recorder = createMediaRecorder(stream, async (blob) => {
          try {
            const text = await doubaoTranscribe(blob);
            if (text) {
              setTranscript((prev) => prev + text);
            }
            resolve();
          } catch (err) {
            reject(
              err instanceof Error ? err : new Error('豆包 ASR 转写失败'),
            );
          }
        });

        mediaRecorderRef.current = recorder;
        recorder.start();
      } catch (err) {
        reject(
          err instanceof Error ? err : new Error('无法获取麦克风权限'),
        );
      }
    });
  }, []);

  // ------ 带降级的启动逻辑 ------

  const startWithLevel = useCallback(
    async (level: VoiceLevel): Promise<void> => {
      try {
        switch (level) {
          case 'web':
            await startWebSpeech();
            break;
          case 'native':
            await startNativeASR();
            break;
          case 'doubao':
            await startDoubaoASR();
            break;
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '语音识别失败';
        console.warn(
          `[useVoiceRecognition] ${level} 级别失败，尝试降级: ${message}`,
        );

        // 尝试降级
        const didFallback = fallbackASR();
        if (didFallback) {
          const nextLevel = useVoiceStore.getState().currentASRLevel;
          console.warn(
            `[useVoiceRecognition] 降级: ${level} → ${nextLevel}`,
          );
          await startWithLevel(nextLevel);
        } else {
          // 所有级别都失败
          setError(`语音识别不可用: ${message}`);
          setIsListening(false);
          throw new Error(`所有 ASR 级别均不可用: ${message}`);
        }
      }
    },
    [startWebSpeech, startNativeASR, startDoubaoASR, fallbackASR],
  );

  // ------ Public API ------

  const startListening = useCallback(async (): Promise<void> => {
    // 确保已检测能力
    if (!isDetected) {
      await detect();
    }

    cleanupAll();
    setError(null);
    isStoppedRef.current = false;
    setIsListening(true);

    const level = useVoiceStore.getState().currentASRLevel;

    try {
      await startWithLevel(level);
    } catch {
      // Error already set in startWithLevel
      setIsListening(false);
    }
  }, [isDetected, detect, cleanupAll, startWithLevel]);

  const stopListening = useCallback(() => {
    isStoppedRef.current = true;

    // Stop Web Speech API
    if (webRecognitionRef.current) {
      try {
        webRecognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    // Stop Native ASR
    jsBridge.nativeASR.stopRecognition();

    // Stop MediaRecorder (doubao)
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      mediaRecorderRef.current.stop();
    }

    // Stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  // ------ Cleanup on unmount ------

  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  return {
    isListening,
    transcript,
    error,
    currentLevel: currentASRLevel,
    startListening,
    stopListening,
    resetTranscript,
  };
}

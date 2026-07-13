'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  startPcmWavRecording,
  type RecordingResult,
  type VoiceRecorderSession,
} from '@/lib/audio/recorder';
import { ApiError, fetchFormData } from '@/lib/api';
import type { VoiceLevel } from '@/lib/voiceCapabilities';
import { useVoiceStore } from '@/stores/voiceStore';

const MAX_RECORDING_DURATION_MS = 60_000;
const WEB_FINAL_RESULT_TIMEOUT_MS = 3_000;

export type RecognitionPhase =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'transcribing'
  | 'success'
  | 'error';

export interface StopResult {
  transcript: string;
  audioBlob: Blob;
  durationMs: number;
}

export interface UseVoiceRecognitionReturn {
  isListening: boolean;
  phase: RecognitionPhase;
  transcript: string;
  error: string | null;
  currentLevel: VoiceLevel;
  startListening: () => Promise<void>;
  stopListening: () => Promise<StopResult | null>;
  cancelListening: () => void;
  resetTranscript: () => void;
}

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

interface WebRecognitionSession {
  stop(): Promise<string>;
  cancel(): void;
}

interface RecognitionOperation {
  readonly id: number;
  readonly controller: AbortController;
  level: VoiceLevel;
  session: VoiceRecorderSession | null;
  web: WebRecognitionSession | null;
  cancelled: boolean;
  stopPromise: Promise<StopResult | null> | null;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isPermissionError(error: unknown): boolean {
  return error instanceof DOMException
    && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
}

function shouldUseWebOnNextAttempt(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status === null
    || error.status === 429
    || (error.status !== null && error.status >= 500);
}

function createWebRecognition(
  onVisibleText: (text: string) => void,
): WebRecognitionSession {
  const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Constructor) throw new Error('浏览器语音识别不可用');

  const recognition = new Constructor();
  let finalText = '';
  let interimText = '';
  let settled = false;
  let stopping = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let resolveResult!: (text: string) => void;
  let rejectResult!: (error: Error) => void;
  const resultPromise = new Promise<string>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const cleanup = (): void => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
  };
  const resolveOnce = (text: string): void => {
    if (settled) return;
    settled = true;
    cleanup();
    resolveResult(text.trim());
  };
  const rejectOnce = (error: Error): void => {
    if (settled) return;
    settled = true;
    cleanup();
    rejectResult(error);
  };

  recognition.lang = 'zh-CN';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (event) => {
    interimText = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const text = result[0]?.transcript ?? '';
      if (result.isFinal) finalText += text;
      else interimText += text;
    }
    onVisibleText(`${finalText}${interimText}`.trim());
  };
  recognition.onerror = (event) => {
    if (event.error === 'aborted') resolveOnce('');
    else rejectOnce(new Error(`浏览器语音识别失败：${event.error}`));
  };
  recognition.onend = () => resolveOnce(finalText);
  recognition.start();

  return {
    stop(): Promise<string> {
      if (!stopping && !settled) {
        stopping = true;
        timeoutId = setTimeout(() => {
          rejectOnce(new Error('浏览器语音识别结束超时'));
        }, WEB_FINAL_RESULT_TIMEOUT_MS);
        try {
          recognition.stop();
        } catch (error) {
          rejectOnce(error instanceof Error ? error : new Error('无法停止浏览器语音识别'));
        }
      }
      return resultPromise;
    },
    cancel(): void {
      if (settled) return;
      try {
        recognition.abort();
      } catch {
        // 继续结算本地 Promise，避免取消流程悬挂。
      }
      resolveOnce('');
    },
  };
}

function toStopResult(
  recording: RecordingResult,
  transcript: string,
): StopResult {
  return {
    transcript,
    audioBlob: recording.blob,
    durationMs: recording.durationMs,
  };
}

export function useVoiceRecognition(): UseVoiceRecognitionReturn {
  const {
    currentASRLevel,
    fallbackASR,
    isDetected,
    detect,
  } = useVoiceStore();
  const [phase, setPhase] = useState<RecognitionPhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const operationRef = useRef<RecognitionOperation | null>(null);
  const operationIdRef = useRef(0);

  const updateOperation = useCallback((
    operation: RecognitionOperation,
    update: () => void,
  ): void => {
    if (mountedRef.current && operationRef.current === operation) update();
  }, []);

  const cancelOperation = useCallback((operation: RecognitionOperation): void => {
    if (operation.cancelled) return;
    operation.cancelled = true;
    if (operation.timeoutId !== null) {
      clearTimeout(operation.timeoutId);
      operation.timeoutId = null;
    }
    operation.controller.abort();
    operation.web?.cancel();
    operation.session?.abort();
  }, []);

  const finishOperation = useCallback((
    operation: RecognitionOperation,
  ): Promise<StopResult | null> => {
    if (operation.stopPromise) return operation.stopPromise;

    operation.stopPromise = (async (): Promise<StopResult | null> => {
      if (operation.timeoutId !== null) {
        clearTimeout(operation.timeoutId);
        operation.timeoutId = null;
      }
      if (operation.cancelled) return null;
      if (!operation.session) {
        cancelOperation(operation);
        updateOperation(operation, () => {
          setError(null);
          setPhase('idle');
          operationRef.current = null;
        });
        return null;
      }

      updateOperation(operation, () => setPhase('transcribing'));

      try {
        let recording: RecordingResult;
        let text: string;

        if (operation.level === 'web') {
          if (!operation.web) throw new Error('浏览器语音识别尚未启动');
          [recording, text] = await Promise.all([
            operation.session.stop(),
            operation.web.stop(),
          ]);
        } else {
          recording = await operation.session.stop();
          if (operation.cancelled) return null;

          const formData = new FormData();
          formData.append('file', recording.blob, 'recording.wav');
          const response = await fetchFormData<{ text?: unknown }>(
            '/api/v1/voice/transcribe',
            formData,
            { signal: operation.controller.signal },
          );
          text = typeof response.text === 'string' ? response.text : '';
        }

        if (operation.cancelled) return null;
        const finalText = text.trim();
        if (!finalText) {
          throw new ApiError('未识别到有效语音，请靠近麦克风后重试', 422);
        }

        const result = toStopResult(recording, finalText);
        updateOperation(operation, () => {
          setTranscript(finalText);
          setError(null);
          setPhase('success');
          operationRef.current = null;
        });
        return result;
      } catch (cause) {
        if (operation.cancelled || isAbortError(cause)) return null;

        let message = cause instanceof Error ? cause.message : '语音转写失败';
        if (operation.level === 'mimo' && shouldUseWebOnNextAttempt(cause)) {
          const movedToWeb = fallbackASR()
            && useVoiceStore.getState().currentASRLevel === 'web';
          if (movedToWeb) {
            message = `本次录音转写失败，请重新录音使用浏览器识别：${message}`;
          }
        }

        updateOperation(operation, () => {
          setError(message);
          setPhase('error');
          operationRef.current = null;
        });
        throw new Error(message, { cause });
      }
    })();

    return operation.stopPromise;
  }, [cancelOperation, fallbackASR, updateOperation]);

  const startListening = useCallback(async (): Promise<void> => {
    const previous = operationRef.current;
    if (previous) cancelOperation(previous);

    const operation: RecognitionOperation = {
      id: ++operationIdRef.current,
      controller: new AbortController(),
      level: 'mimo',
      session: null,
      web: null,
      cancelled: false,
      stopPromise: null,
      timeoutId: null,
    };
    operationRef.current = operation;
    setTranscript('');
    setError(null);
    setPhase('requesting_permission');

    try {
      if (!isDetected) await detect();
      if (operation.cancelled) return;
      operation.level = useVoiceStore.getState().currentASRLevel;

      const session = await startPcmWavRecording({
        maxDurationMs: MAX_RECORDING_DURATION_MS,
        signal: operation.controller.signal,
      });
      if (operation.cancelled) {
        session.abort();
        return;
      }
      operation.session = session;

      if (operation.level === 'web') {
        operation.web = createWebRecognition((visibleText) => {
          updateOperation(operation, () => setTranscript(visibleText));
        });
      }

      updateOperation(operation, () => setPhase('recording'));
      operation.timeoutId = setTimeout(() => {
        void finishOperation(operation).catch(() => undefined);
      }, MAX_RECORDING_DURATION_MS);
    } catch (cause) {
      if (operation.cancelled || isAbortError(cause)) return;
      const message = isPermissionError(cause)
        ? '无法使用麦克风权限，请在系统设置中允许后重试'
        : cause instanceof Error
          ? `无法开始录音：${cause.message}`
          : '无法开始录音';
      cancelOperation(operation);
      updateOperation(operation, () => {
        setError(message);
        setPhase('error');
        operationRef.current = null;
      });
    }
  }, [cancelOperation, detect, finishOperation, isDetected, updateOperation]);

  const stopListening = useCallback((): Promise<StopResult | null> => {
    const operation = operationRef.current;
    return operation ? finishOperation(operation) : Promise.resolve(null);
  }, [finishOperation]);

  const cancelListening = useCallback((): void => {
    const operation = operationRef.current;
    if (operation) cancelOperation(operation);
    operationRef.current = null;
    if (mountedRef.current) {
      setTranscript('');
      setError(null);
      setPhase('idle');
    }
  }, [cancelOperation]);

  const resetTranscript = useCallback((): void => {
    setTranscript('');
    setError(null);
    setPhase((current) =>
      current === 'success' || current === 'error' ? 'idle' : current);
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
    isListening: phase === 'requesting_permission' || phase === 'recording',
    phase,
    transcript,
    error,
    currentLevel: currentASRLevel,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
  };
}

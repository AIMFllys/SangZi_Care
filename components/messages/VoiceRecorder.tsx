'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceRecognition, type StopResult } from '@/hooks/useVoiceRecognition';
import styles from './VoiceRecorder.module.css';

type RecorderStage =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'transcribing'
  | 'review'
  | 'sending'
  | 'error';

export interface VoiceMessageDraft {
  content: string;
  audioBlob: Blob;
  durationMs: number;
  signal: AbortSignal;
}

export type TranscriptDraftPlacement = 'seeded' | 'manual-preserved';

export interface VoiceRecorderProps {
  onSend: (data: VoiceMessageDraft) => Promise<void> | void;
  onCancel: () => void;
  onTranscriptReady: (transcript: string) => TranscriptDraftPlacement;
  onEditAsText: (transcript: string, placement: TranscriptDraftPlacement) => void;
  onTranscriptDiscard: (transcript: string) => void;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function formatDuration(durationMs: number): string {
  return `${(durationMs / 1_000).toFixed(1)}秒`;
}

export default function VoiceRecorder({
  onSend,
  onCancel,
  onTranscriptReady,
  onEditAsText,
  onTranscriptDiscard,
}: VoiceRecorderProps) {
  const {
    phase: recognitionPhase,
    error: recognitionError,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
  } = useVoiceRecognition();

  const [stage, setStage] = useState<RecorderStage>('idle');
  const [draft, setDraft] = useState<StopResult | null>(null);
  const [draftPlacement, setDraftPlacement] = useState<TranscriptDraftPlacement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runIdRef = useRef(0);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const sendInFlightRef = useRef(false);
  const editHandledRef = useRef(false);

  const finishRecording = useCallback(async (): Promise<void> => {
    const runId = runIdRef.current;
    setStage('transcribing');
    setError(null);

    try {
      const result = await stopListening();
      if (runIdRef.current !== runId) return;
      if (!result?.transcript.trim()) {
        throw new Error('未识别到有效语音，请重新录制');
      }
      if (result.audioBlob.type !== 'audio/wav' || result.audioBlob.size === 0) {
        throw new Error('录音文件无效，请重新录制');
      }

      const transcript = result.transcript.trim();
      const placement = onTranscriptReady(transcript);
      setDraft({ ...result, transcript });
      setDraftPlacement(placement);
      editHandledRef.current = false;
      setStage('review');
    } catch (cause) {
      if (runIdRef.current !== runId || isAbortError(cause)) return;
      setError(cause instanceof Error ? cause.message : '语音识别失败，请重试');
      setStage('error');
    }
  }, [onTranscriptReady, stopListening]);

  const startRecording = useCallback(async (): Promise<void> => {
    const runId = ++runIdRef.current;
    if (draft) onTranscriptDiscard(draft.transcript);
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
    sendInFlightRef.current = false;
    editHandledRef.current = false;
    resetTranscript();
    setDraft(null);
    setDraftPlacement(null);
    setError(null);
    setStage('requesting');

    try {
      await startListening();
      if (runIdRef.current !== runId) return;
      setStage('recording');
    } catch (cause) {
      if (runIdRef.current !== runId || isAbortError(cause)) return;
      setError(cause instanceof Error ? cause.message : '无法开始录音，请检查麦克风权限');
      setStage('error');
    }
  }, [draft, onTranscriptDiscard, resetTranscript, startListening]);

  const handleMicToggle = useCallback((): void => {
    if (stage === 'recording') {
      void finishRecording();
      return;
    }
    if (stage !== 'requesting' && stage !== 'transcribing' && stage !== 'sending') {
      void startRecording();
    }
  }, [finishRecording, stage, startRecording]);

  const handleSend = useCallback(async (): Promise<void> => {
    if (!draft || sendInFlightRef.current || editHandledRef.current) return;
    sendInFlightRef.current = true;
    const runId = runIdRef.current;
    const controller = new AbortController();
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = controller;
    setError(null);
    setStage('sending');

    try {
      await onSend({
        content: draft.transcript,
        audioBlob: draft.audioBlob,
        durationMs: draft.durationMs,
        signal: controller.signal,
      });
      if (runIdRef.current !== runId || controller.signal.aborted) return;
      resetTranscript();
      setDraft(null);
      setDraftPlacement(null);
      setStage('idle');
    } catch (cause) {
      if (runIdRef.current !== runId || isAbortError(cause)) return;
      setError(cause instanceof Error ? cause.message : '语音发送失败，请重试');
      setStage('review');
    } finally {
      if (uploadControllerRef.current === controller) {
        uploadControllerRef.current = null;
        sendInFlightRef.current = false;
      }
    }
  }, [draft, onSend, resetTranscript]);

  const handleEditAsText = useCallback((): void => {
    if (
      !draft
      || !draftPlacement
      || sendInFlightRef.current
      || editHandledRef.current
    ) return;

    editHandledRef.current = true;
    runIdRef.current += 1;
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
    cancelListening();
    resetTranscript();
    onEditAsText(draft.transcript, draftPlacement);
    setDraft(null);
    setDraftPlacement(null);
    setError(null);
    setStage('idle');
  }, [cancelListening, draft, draftPlacement, onEditAsText, resetTranscript]);

  const handleCancel = useCallback((): void => {
    runIdRef.current += 1;
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
    sendInFlightRef.current = false;
    cancelListening();
    resetTranscript();
    if (draft) onTranscriptDiscard(draft.transcript);
    setDraft(null);
    setDraftPlacement(null);
    setError(null);
    setStage('idle');
    onCancel();
  }, [cancelListening, draft, onCancel, onTranscriptDiscard, resetTranscript]);

  useEffect(() => {
    if (stage === 'recording' && recognitionPhase === 'success') {
      void finishRecording();
    }
  }, [finishRecording, recognitionPhase, stage]);

  useEffect(() => {
    if (!recognitionError || stage === 'idle') return;
    setError(recognitionError);
    setStage('error');
  }, [recognitionError, stage]);

  useEffect(() => () => {
    runIdRef.current += 1;
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
    sendInFlightRef.current = false;
    cancelListening();
  }, [cancelListening]);

  const isRecording = stage === 'recording';
  const isBusy = stage === 'requesting' || stage === 'transcribing' || stage === 'sending';

  return (
    <div className={styles.container} data-testid="voice-recorder">
      {isRecording && (
        <div className={styles.recordingHud} role="status" aria-live="polite">
          <span className={styles.recordingDot} aria-hidden="true" />
          <span>正在录音，最长 60 秒</span>
        </div>
      )}

      {stage === 'requesting' && (
        <div className={styles.recordingHud} role="status" aria-live="polite">
          <span>正在申请麦克风权限...</span>
          <button
            className={styles.pendingCancelBtn}
            onClick={handleCancel}
            type="button"
            aria-label="取消录音"
          >
            取消
          </button>
        </div>
      )}

      {stage === 'transcribing' && (
        <div className={styles.recordingHud} role="status" aria-live="polite">
          <span>正在识别，请稍候...</span>
          <button
            className={styles.pendingCancelBtn}
            onClick={handleCancel}
            type="button"
            aria-label="取消录音"
          >
            取消
          </button>
        </div>
      )}

      {draft && stage !== 'idle' && (
        <div className={styles.reviewPanel} aria-live="polite">
          <div className={styles.reviewMeta}>
            <span>语音转写</span>
            <span>{formatDuration(draft.durationMs)}</span>
          </div>
          <p className={styles.transcript}>{draft.transcript}</p>
          {draftPlacement && (
            <p className={styles.draftNotice} role="status">
              {draftPlacement === 'seeded'
                ? '转写已加入文字草稿，可编辑后作为文字发送。'
                : '已有文字草稿，转写未覆盖。可选择追加后编辑。'}
            </p>
          )}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.actions}>
            <button
              className={styles.editBtn}
              onClick={handleEditAsText}
              type="button"
              aria-label={draftPlacement === 'manual-preserved'
                ? '将转写追加到已有文字并编辑'
                : '编辑转写文字'}
              disabled={stage === 'sending' || !draftPlacement}
            >
              {draftPlacement === 'manual-preserved' ? '追加并编辑' : '编辑文字'}
            </button>
            <button
              className={styles.cancelBtn}
              onClick={handleCancel}
              type="button"
              aria-label="取消录音"
            >
              取消
            </button>
            <button
              className={styles.sendBtn}
              onClick={() => void handleSend()}
              type="button"
              aria-label={stage === 'sending' ? '正在发送语音' : '发送语音消息'}
              disabled={stage === 'sending'}
            >
              {stage === 'sending' ? '发送中...' : '发送语音'}
            </button>
          </div>
        </div>
      )}

      {!draft && error && <p className={styles.errorPanel} role="alert">{error}</p>}

      <button
        className={`${styles.micBtn} ${isRecording ? styles.micBtnRecording : ''}`}
        onClick={handleMicToggle}
        type="button"
        aria-label={isRecording ? '停止录音' : draft ? '重新录音' : '开始录音'}
        data-testid="mic-button"
        disabled={isBusy}
      >
        <span aria-hidden="true">{isRecording ? '■' : '🎤'}</span>
        <span>{isRecording ? '结束录音' : draft ? '重新录音' : '开始录音'}</span>
      </button>
    </div>
  );
}

'use client';

// ============================================================
// 桑梓智护 — 语音录制组件
// 点击录音、再次点击停止，显示实时转写文本
// 适老化：超大麦克风按钮（80px+）
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import styles from './VoiceRecorder.module.css';

// ---------- Props ----------

export interface VoiceRecorderProps {
  onSend: (data: { content: string; duration: number }) => void;
  onCancel: () => void;
}

// ---------- 组件 ----------

export default function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const { isListening, transcript, startListening, stopListening, resetTranscript } =
    useVoiceRecognition();

  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 录音计时器
  useEffect(() => {
    if (isListening) {
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isListening]);

  // 点击麦克风：开始/停止录音
  const handleMicToggle = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setRecordingDuration(0);
      await startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript]);

  // 发送
  const handleSend = useCallback(() => {
    if (isListening) {
      stopListening();
    }
    const content = transcript.trim();
    if (content) {
      onSend({ content, duration: recordingDuration });
    }
  }, [isListening, stopListening, transcript, recordingDuration, onSend]);

  // 取消
  const handleCancel = useCallback(() => {
    if (isListening) {
      stopListening();
    }
    resetTranscript();
    setRecordingDuration(0);
    onCancel();
  }, [isListening, stopListening, resetTranscript, onCancel]);

  return (
    <div className={styles.container} data-testid="voice-recorder">
      {isListening && (
        <div className={styles.recordingHud} role="status" aria-live="polite">
          <span className={styles.recordingDot} aria-hidden="true" />
          <span className={styles.timer}>{recordingDuration}秒</span>
          <span>正在录音，再点一次结束</span>
        </div>
      )}

      {transcript && !isListening && (
        <div className={styles.reviewPanel} aria-live="polite">
          <p className={styles.transcript}>{transcript}</p>
          <div className={styles.actions}>
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
              onClick={handleSend}
              type="button"
              aria-label="发送语音消息"
            >
              发送
            </button>
          </div>
        </div>
      )}

      <button
        className={`${styles.micBtn} ${isListening ? styles.micBtnRecording : ''}`}
        onClick={handleMicToggle}
        type="button"
        aria-label={isListening ? '停止录音' : '按住说话'}
        data-testid="mic-button"
      >
        <span aria-hidden="true">{isListening ? '■' : '🎤'}</span>
        <span>{isListening ? '结束录音' : '按住说话'}</span>
      </button>
    </div>
  );
}

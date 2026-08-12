'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Mic, Settings, Square } from 'lucide-react';
import { Button, Card, IconButton } from '@/components/ui';
import PageHeader from '@/components/layout/PageHeader';
import { useAIChat } from '@/hooks/useAIChat';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { ROUTES } from '@/lib/constants';
import type { AIAction, AIActionStatus } from '@/types/ai';
import styles from './page.module.css';

type VoiceConversationPhase =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'error';

const STATUS_BY_PHASE: Record<VoiceConversationPhase, string> = {
  idle: '点击麦克风开始下一轮对话',
  recording: '正在听您说话，再点一次结束',
  transcribing: '正在识别您刚才说的话...',
  thinking: 'AI 正在思考...',
  speaking: '正在为您播报...',
  error: '对话遇到问题',
};

const ACTION_STATUS_LABEL: Record<AIActionStatus, string> = {
  success: '已完成',
  warning: '请留意',
  error: '未完成',
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export default function VoicePage() {
  const router = useRouter();
  const { messages, sendMessage, cancelPending, error: aiError } = useAIChat();
  const {
    transcript,
    phase: recognitionPhase,
    error: recognitionError,
    startListening,
    stopListening,
    cancelListening,
    resetTranscript,
  } = useVoiceRecognition();
  const { speak, stop: stopSpeaking, error: ttsError } = useTextToSpeech();

  const [phase, setPhase] = useState<VoiceConversationPhase>('idle');
  const [recognizedText, setRecognizedText] = useState('');
  const [assistantText, setAssistantText] = useState('');
  const [assistantActions, setAssistantActions] = useState<AIAction[]>([]);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const runIdRef = useRef(0);
  const mountedRef = useRef(true);

  const lastAiMessage = [...messages].reverse().find((message) =>
    message.role === 'assistant');
  const visibleTranscript = recognizedText || transcript;
  const visibleReply = assistantText || lastAiMessage?.content || '';
  const hasAssistantActions = assistantActions.length > 0;
  const isRecording = phase === 'recording';
  const isBusy = phase === 'transcribing'
    || phase === 'thinking'
    || phase === 'speaking';

  const isCurrentRun = useCallback((runId: number): boolean =>
    mountedRef.current && runIdRef.current === runId, []);

  const showFailure = useCallback((message: string, runId?: number): void => {
    if (runId !== undefined && !isCurrentRun(runId)) return;
    if (!mountedRef.current) return;
    setConversationError(message);
    setPhase('error');
  }, [isCurrentRun]);

  const cancelAll = useCallback((): void => {
    runIdRef.current += 1;
    cancelListening();
    cancelPending();
    stopSpeaking();
  }, [cancelListening, cancelPending, stopSpeaking]);

  const startConversation = useCallback(async (): Promise<void> => {
    const runId = ++runIdRef.current;
    setConversationError(null);
    setRecognizedText('');
    setAssistantActions([]);
    resetTranscript();
    setPhase('recording');

    try {
      await startListening();
    } catch (error) {
      showFailure(`无法开始录音：${getErrorMessage(error, '请检查麦克风权限')}`, runId);
    }
  }, [resetTranscript, showFailure, startListening]);

  const finishConversation = useCallback(async (): Promise<void> => {
    const runId = runIdRef.current;
    setConversationError(null);
    setPhase('transcribing');

    try {
      const result = await stopListening();
      if (!isCurrentRun(runId)) return;
      const userText = result?.transcript.trim() ?? '';
      if (!userText) throw new Error('未识别到有效语音，请点击麦克风重试');

      setRecognizedText(userText);
      setPhase('thinking');
      const chatResult = await sendMessage(userText);
      if (!isCurrentRun(runId)) return;

      setAssistantText(chatResult.reply);
      setAssistantActions(chatResult.actions);
      setPhase('speaking');
      await speak(chatResult.reply);
      if (!isCurrentRun(runId)) return;
      setPhase('idle');
    } catch (error) {
      showFailure(getErrorMessage(error, '本轮语音对话失败，请重试'), runId);
    }
  }, [isCurrentRun, sendMessage, showFailure, speak, stopListening]);

  useEffect(() => {
    if (phase === 'recording' && recognitionPhase === 'success') {
      void finishConversation();
    }
  }, [finishConversation, phase, recognitionPhase]);

  const handleMicClick = useCallback((): void => {
    if (isRecording) {
      void finishConversation();
      return;
    }
    if (!isBusy) void startConversation();
  }, [finishConversation, isBusy, isRecording, startConversation]);

  const handleEnd = useCallback((): void => {
    cancelAll();
    setRecognizedText('');
    setAssistantText('');
    setAssistantActions([]);
    setConversationError(null);
    setPhase('idle');
    router.back();
  }, [cancelAll, router]);

  const handleSettings = useCallback((): void => {
    cancelAll();
    router.push(ROUTES.SETTINGS_ACCESSIBILITY);
  }, [cancelAll, router]);

  useEffect(() => {
    if (recognitionError) showFailure(recognitionError);
  }, [recognitionError, showFailure]);

  useEffect(() => {
    if (aiError) showFailure(aiError);
  }, [aiError, showFailure]);

  useEffect(() => {
    if (ttsError) showFailure(ttsError);
  }, [showFailure, ttsError]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runIdRef.current += 1;
      cancelListening();
      cancelPending();
      stopSpeaking();
    };
  }, [cancelListening, cancelPending, stopSpeaking]);

  const status = phase === 'idle' && !visibleReply
    ? '点击麦克风开始对话'
    : STATUS_BY_PHASE[phase];

  return (
    <div className={`${styles.page} ${hasAssistantActions ? styles.pageWithActions : ''}`}>
      <PageHeader
        title="智能语音助手"
        variant="detail"
        onBack={handleEnd}
        rightAction={
          <IconButton
            variant="ghost"
            aria-label="语音设置"
            onClick={handleSettings}
          >
            <Settings size={24} />
          </IconButton>
        }
      />

      <p className={styles.statusText} aria-live="polite">{status}</p>

      {conversationError ? (
        <div className={styles.errorPanel} role="alert">
          <p>{conversationError}</p>
          <span>点击麦克风重试</span>
        </div>
      ) : (
        <p className={styles.recognizedText} aria-live="polite">
          {visibleTranscript}
        </p>
      )}

      <div className={styles.micSection}>
        <div className={styles.micWrapper}>
          <div className={styles.micRing} aria-hidden="true" />
          <div
            className={`${styles.micRing} ${styles.micRingDelayed}`}
            aria-hidden="true"
          />
          <button
            type="button"
            className={`${styles.micBall} interactive ${isRecording ? styles.micBallActive : ''}`}
            onClick={handleMicClick}
            aria-label={isRecording ? '停止听取' : '开始说话'}
            disabled={isBusy}
          >
            <span className={styles.micIcon} aria-hidden="true">
              {isRecording ? <Square size={48} /> : <Mic size={56} />}
            </span>
          </button>
        </div>
      </div>

      {visibleReply && (
        <Card
          variant="glass"
          className={`${styles.responseCard} ${hasAssistantActions ? styles.responseCardWithActions : ''}`}
          role="region"
          aria-label="AI 回复"
          data-layout={hasAssistantActions ? 'with-actions' : 'default'}
        >
          <div className={styles.responseLabel}>
            <span className={styles.responseIcon} aria-hidden="true">
              <Bot size={20} color="var(--accent)" />
            </span>
            AI 回复
          </div>
          <div
            className={styles.responseBody}
            role="document"
            aria-label="AI 回复内容"
            tabIndex={0}
          >
            <p className={styles.responseText}>{visibleReply}</p>
          </div>
        </Card>
      )}

      {assistantActions.length > 0 && (
        <section
          className={styles.actionFeedback}
          role="status"
          aria-label="本轮处理结果"
          aria-live="polite"
          tabIndex={0}
        >
          <h2>本轮处理结果</h2>
          <ul>
            {assistantActions.map((item, index) => (
              <li
                key={`${item.type}-${index}`}
                className={styles[`action_${item.status}`]}
              >
                <span className={styles.actionStatus}>
                  {ACTION_STATUS_LABEL[item.status]}
                </span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Button
        variant="ghost"
        size="lg"
        fullWidth
        leftIcon={<Square size={20} />}
        className={styles.endButton}
        onClick={handleEnd}
      >
        结束对话
      </Button>
    </div>
  );
}

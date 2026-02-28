'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAIChat, type ChatMessage } from '@/hooks/useAIChat';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { dispatchIntent, type IntentHandlerContext } from '@/lib/intentHandlers';
import { useUserStore } from '@/stores/userStore';
import { useFamilyStore } from '@/stores/familyStore';
import { useMessageStore } from '@/stores/messageStore';
import { ROUTES } from '@/lib/constants';
import styles from './page.module.css';

export default function VoicePage() {
  const router = useRouter();
  const { isReady } = useAuth();
  const user = useUserStore((s) => s.user);
  const isElder = useUserStore((s) => s.isElder);
  const binds = useFamilyStore((s) => s.binds);
  const sendTextMsg = useMessageStore((s) => s.sendTextMessage);

  const { messages, isLoading, error, sendMessage, recognizeIntent } = useAIChat();
  const { isListening, transcript, startListening, stopListening } = useVoiceRecognition();
  const { speak } = useTextToSpeech();

  const [textInput, setTextInput] = useState('');
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // 语音识别结果处理
  useEffect(() => {
    if (transcript && !isListening) {
      handleUserInput(transcript);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, isListening]);

  // 构建意图处理上下文
  const buildIntentContext = useCallback((): IntentHandlerContext => ({
    userId: user?.id || '',
    familyBinds: binds.map((b) => ({
      bind: { relation: b.bind.relation, elder_id: b.bind.elder_id, family_id: b.bind.family_id },
      user: { id: b.user.id, name: b.user.name },
    })),
    sendMessage: async (receiverId: string, content: string) => {
      await sendTextMsg(user?.id || '', receiverId, content);
    },
  }), [user, binds, sendTextMsg]);

  // 处理用户输入（文字或语音）
  async function handleUserInput(text: string) {
    if (!text.trim()) return;
    setActionResult(null);

    try {
      // 先识别意图
      const intentResult = await recognizeIntent(text);

      if (intentResult.intent !== 'general_chat' && intentResult.confidence > 0.6) {
        // 执行意图操作
        const context = buildIntentContext();
        const result = await dispatchIntent(intentResult, context);
        setActionResult(result);

        // 发送对话获取AI回复
        const reply = await sendMessage(text);
        if (isElder) {
          speak(reply);
        }
      } else {
        // 普通对话
        const reply = await sendMessage(text);
        if (isElder) {
          speak(reply);
        }
      }
    } catch {
      // sendMessage 已处理错误
    }
  }

  // 发送文字消息
  function handleSendText() {
    if (!textInput.trim() || isLoading) return;
    const text = textInput.trim();
    setTextInput('');
    handleUserInput(text);
  }

  // 切换语音识别
  function handleMicToggle() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  if (!isReady) {
    return <div className={styles.loading}>加载中…</div>;
  }

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push(ROUTES.HOME)}
          aria-label="返回首页"
        >
          ‹ 返回
        </button>
        <h1 className={styles.title}>语音助手</h1>
      </div>

      {error && (
        <div className={styles.errorBanner} role="alert">{error}</div>
      )}

      {/* 对话区域 */}
      <div className={styles.chatArea} role="log" aria-label="对话记录" aria-live="polite">
        {messages.length === 0 && !isLoading ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon} aria-hidden="true">🎙️</span>
            <p className={styles.emptyText}>
              您好，我是桑梓智护语音助手
            </p>
            <p className={styles.emptyHint}>
              试试说"我血压怎么样"或"给我女儿捂个话"
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg: ChatMessage, i: number) => (
              <div
                key={i}
                className={`${styles.messageBubble} ${
                  msg.role === 'user' ? styles.userBubble : styles.assistantBubble
                }`}
              >
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className={`${styles.messageBubble} ${styles.loadingBubble}`}>
                正在思考...
              </div>
            )}
          </>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* 操作结果提示 */}
      {actionResult && (
        <div
          className={`${styles.actionResult} ${
            actionResult.success ? styles.actionSuccess : styles.actionError
          }`}
          role="status"
        >
          {actionResult.message}
        </div>
      )}

      {/* 输入区域 */}
      <div className={styles.inputArea}>
        <div className={styles.inputRow}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendText();
              }
            }}
            placeholder="输入文字或点击麦克风说话"
            className={styles.textInput}
            aria-label="输入消息"
            disabled={isLoading}
          />
          <button
            className={styles.sendButton}
            onClick={handleSendText}
            disabled={!textInput.trim() || isLoading}
            aria-label="发送"
          >
            ➤
          </button>
          <button
            className={`${styles.micButton} ${isListening ? styles.micButtonListening : ''}`}
            onClick={handleMicToggle}
            aria-label={isListening ? '停止录音' : '开始录音'}
          >
            🎤
          </button>
        </div>
      </div>
    </main>
  );
}

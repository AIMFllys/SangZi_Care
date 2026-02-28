'use client';

// ============================================================
// 桑梓智护 — 聊天详情页（客户端组件）
// 聊天气泡展示历史消息，支持文字/语音输入切换
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMessageStore } from '@/stores/messageStore';
import { useUserStore } from '@/stores/userStore';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { ROUTES } from '@/lib/constants';
import MessageList from '@/components/messages/MessageList';
import VoiceRecorder from '@/components/messages/VoiceRecorder';
import type { MessageResponse } from '@/stores/messageStore';
import styles from './page.module.css';

// ---------- 组件 ----------

export default function ChatDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const contactId = params?.id ?? '';

  const user = useUserStore((s) => s.user);
  const { messages, loading, fetchMessages, sendTextMessage, sendVoiceMessage, markAsRead } =
    useMessageStore();
  const { speak } = useTextToSpeech();

  // 输入模式：text 或 voice
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('voice');
  const [textInput, setTextInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // 加载消息
  useEffect(() => {
    if (contactId) {
      fetchMessages(contactId);
    }
  }, [contactId, fetchMessages]);

  // 标记收到的消息为已读
  useEffect(() => {
    if (messages.length > 0 && user?.id) {
      const unreadReceived = messages.filter(
        (m) => m.receiver_id === user.id && !m.is_read,
      );
      unreadReceived.forEach((m) => {
        markAsRead(m.id);
      });
    }
  }, [messages, user?.id, markAsRead]);

  // 播放语音消息（使用 TTS 朗读转写文本）
  const handlePlayVoice = useCallback(
    (message: MessageResponse) => {
      const text = message.content;
      if (text) {
        speak(text);
      }
    },
    [speak],
  );

  // 发送文字消息
  const handleSendText = useCallback(async () => {
    const content = textInput.trim();
    if (!content || !user?.id || !contactId || isSending) return;

    setIsSending(true);
    try {
      await sendTextMessage(user.id, contactId, content);
      setTextInput('');
    } catch {
      // 静默处理
    } finally {
      setIsSending(false);
    }
  }, [textInput, user?.id, contactId, isSending, sendTextMessage]);

  // 发送语音消息
  const handleSendVoice = useCallback(
    async (data: { content: string; duration: number }) => {
      if (!user?.id || !contactId) return;

      setIsSending(true);
      try {
        await sendVoiceMessage(user.id, contactId, {
          content: data.content,
          audio_duration: data.duration,
        });
        setInputMode('voice');
      } catch {
        // 静默处理
      } finally {
        setIsSending(false);
      }
    },
    [user?.id, contactId, sendVoiceMessage],
  );

  // 取消语音录制
  const handleCancelVoice = useCallback(() => {
    // 不做额外操作，VoiceRecorder 内部已处理
  }, []);

  // 切换输入模式
  const toggleInputMode = useCallback(() => {
    setInputMode((prev) => (prev === 'text' ? 'voice' : 'text'));
  }, []);

  // 回车发送
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendText();
      }
    },
    [handleSendText],
  );

  return (
    <div className={styles.page}>
      {/* 顶部栏 */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => router.push(ROUTES.MESSAGES)}
          aria-label="返回消息列表"
          type="button"
        >
          ←
        </button>
        <h1 className={styles.title}>
          {contactId ? `对话` : '聊天'}
        </h1>
      </header>

      {/* 消息列表 */}
      {loading ? (
        <div className={styles.loading}>
          <span>加载中...</span>
        </div>
      ) : (
        <MessageList
          messages={messages}
          currentUserId={user?.id ?? ''}
          onPlayVoice={handlePlayVoice}
        />
      )}

      {/* 底部输入区域 */}
      <div className={styles.inputArea}>
        {/* 输入模式切换按钮 */}
        <button
          className={styles.modeToggle}
          onClick={toggleInputMode}
          type="button"
          aria-label={inputMode === 'text' ? '切换到语音模式' : '切换到文字模式'}
          data-testid="mode-toggle"
        >
          {inputMode === 'text' ? '🎤' : '⌨️'}
        </button>

        {/* 文字输入模式 */}
        {inputMode === 'text' && (
          <div className={styles.textInputRow}>
            <input
              className={styles.textInput}
              type="text"
              placeholder="输入消息..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="输入消息"
              data-testid="text-input"
            />
            <button
              className={styles.sendBtn}
              onClick={handleSendText}
              disabled={!textInput.trim() || isSending}
              type="button"
              aria-label="发送消息"
            >
              发送
            </button>
          </div>
        )}

        {/* 语音输入模式 */}
        {inputMode === 'voice' && (
          <VoiceRecorder onSend={handleSendVoice} onCancel={handleCancelVoice} />
        )}
      </div>
    </div>
  );
}

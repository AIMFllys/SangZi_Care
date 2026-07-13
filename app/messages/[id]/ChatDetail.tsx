'use client';

// ============================================================
// 桑梓智护 — 聊天详情页（客户端组件）
// 聊天气泡展示历史消息，支持文字/语音输入切换
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMessageStore } from '@/stores/messageStore';
import { useUserStore } from '@/stores/userStore';
import { fetchBlob } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import MessageList from '@/components/messages/MessageList';
import VoiceRecorder from '@/components/messages/VoiceRecorder';
import type { VoiceMessageDraft } from '@/components/messages/VoiceRecorder';
import { ChevronLeft, Mic, Keyboard } from 'lucide-react';
import type { MessageResponse } from '@/stores/messageStore';
import styles from './page.module.css';

// ---------- 组件 ----------

export default function ChatDetailPage() {
  const pageRef = useRef<HTMLDivElement>(null);
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const contactId = params?.id ?? '';

  const user = useUserStore((s) => s.user);
  const { messages, loading, fetchMessages, sendTextMessage, sendVoiceMessage, markAsRead } =
    useMessageStore();

  // 输入模式：text 或 voice
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [textInput, setTextInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const playbackRef = useRef<{
    controller: AbortController;
    audio: HTMLAudioElement | null;
    objectUrl: string | null;
  } | null>(null);

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

  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    const previous = root.style.getPropertyValue('--chat-viewport-height');
    const syncViewport = () => {
      root.style.setProperty(
        '--chat-viewport-height',
        `${Math.round(viewport?.height ?? window.innerHeight)}px`,
      );
    };

    syncViewport();
    viewport?.addEventListener('resize', syncViewport);
    viewport?.addEventListener('scroll', syncViewport);
    return () => {
      viewport?.removeEventListener('resize', syncViewport);
      viewport?.removeEventListener('scroll', syncViewport);
      if (previous) root.style.setProperty('--chat-viewport-height', previous);
      else root.style.removeProperty('--chat-viewport-height');
    };
  }, []);

  const cleanupPlayback = useCallback((updateState = true): void => {
    const operation = playbackRef.current;
    if (!operation) return;
    playbackRef.current = null;
    operation.controller.abort();
    if (operation.audio) {
      operation.audio.onended = null;
      operation.audio.onerror = null;
      operation.audio.pause();
    }
    if (operation.objectUrl) URL.revokeObjectURL(operation.objectUrl);
    if (updateState) setVoiceError(null);
  }, []);

  const handlePlayVoice = useCallback(async (message: MessageResponse): Promise<void> => {
    cleanupPlayback();
    if (!message.audio_url) {
      setVoiceError('语音文件不可用，请让对方重新发送');
      return;
    }

    const controller = new AbortController();
    const operation = {
      controller,
      audio: null as HTMLAudioElement | null,
      objectUrl: null as string | null,
    };
    playbackRef.current = operation;
    setVoiceError(null);

    try {
      const blob = await fetchBlob(message.audio_url, { signal: controller.signal });
      if (playbackRef.current !== operation || controller.signal.aborted) return;
      if (blob.size === 0) throw new Error('语音文件为空');

      const objectUrl = URL.createObjectURL(blob);
      operation.objectUrl = objectUrl;
      const audio = new Audio(objectUrl);
      audio.preload = 'auto';
      operation.audio = audio;
      audio.onended = () => {
        if (playbackRef.current === operation) cleanupPlayback(false);
      };
      audio.onerror = () => {
        if (playbackRef.current !== operation) return;
        cleanupPlayback(false);
        setVoiceError('语音播放失败，请重试');
      };
      await audio.play();
    } catch (error) {
      if (controller.signal.aborted) return;
      if (playbackRef.current === operation) cleanupPlayback(false);
      setVoiceError(error instanceof Error ? error.message : '语音播放失败，请重试');
    }
  }, [cleanupPlayback]);

  useEffect(() => () => cleanupPlayback(false), [cleanupPlayback]);

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
    async (data: VoiceMessageDraft) => {
      if (!user?.id || !contactId) throw new Error('无法确认消息接收人');
      if (isSending) throw new Error('语音正在发送，请稍候');

      setIsSending(true);
      try {
        await sendVoiceMessage(user.id, contactId, {
          content: data.content,
          audioBlob: data.audioBlob,
          durationMs: data.durationMs,
          signal: data.signal,
        });
      } finally {
        setIsSending(false);
      }
    },
    [user?.id, contactId, isSending, sendVoiceMessage],
  );

  // 取消语音录制
  const handleCancelVoice = useCallback(() => {
    // 不做额外操作，VoiceRecorder 内部已处理
  }, []);

  // 切换输入模式
  const toggleInputMode = useCallback(() => {
    cleanupPlayback();
    setVoiceError(null);
    setInputMode((prev) => (prev === 'text' ? 'voice' : 'text'));
  }, [cleanupPlayback]);

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
    <div ref={pageRef} className={styles.page}>
      {/* 顶部栏 */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => router.push(ROUTES.MESSAGES)}
          aria-label="返回消息列表"
          type="button"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className={styles.title}>
          {contactId ? `对话` : '聊天'}
        </h1>
        <span className={styles.headerSpacer} aria-hidden="true" />
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
      <footer className={styles.inputArea}>
        {voiceError && (
          <p className={styles.voiceError} role="alert">{voiceError}</p>
        )}
        {/* 输入模式切换按钮 */}
        <button
          className={styles.modeToggle}
          onClick={toggleInputMode}
          type="button"
          aria-label={inputMode === 'text' ? '切换到语音模式' : '切换到文字模式'}
          data-testid="mode-toggle"
        >
          {inputMode === 'text' ? <Mic size={24} /> : <Keyboard size={24} />}
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
      </footer>
    </div>
  );
}

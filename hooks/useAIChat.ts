// ============================================================
// 桑梓智护 — AI对话 Hook
// 封装豆包AI对话、意图识别、会话管理
// 需求: 4.8, 4.9, 4.10
// ============================================================

'use client';

import { useState, useCallback, useRef } from 'react';
import { fetchApi } from '@/lib/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface IntentResult {
  intent: string;
  entities: Record<string, unknown>;
  confidence: number;
}

interface UseAIChatReturn {
  /** 对话历史 */
  messages: ChatMessage[];
  /** 是否正在等待AI回复 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 当前会话ID */
  sessionId: string | null;
  /** 发送文字消息 */
  sendMessage: (text: string) => Promise<string>;
  /** 识别意图 */
  recognizeIntent: (text: string) => Promise<IntentResult>;
  /** 获取对话摘要 */
  getSummary: (userId: string) => Promise<string>;
  /** 清空对话 */
  clearMessages: () => void;
}

export function useAIChat(): UseAIChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const sendMessage = useCallback(async (text: string): Promise<string> => {
    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const chatMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetchApi<{ reply: string; session_id: string }>(
        '/api/v1/ai/chat',
        {
          method: 'POST',
          body: {
            messages: chatMessages,
            session_id: sessionIdRef.current,
          },
        },
      );

      sessionIdRef.current = res.session_id;

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      return res.reply;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '对话失败';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const recognizeIntent = useCallback(async (text: string): Promise<IntentResult> => {
    const res = await fetchApi<IntentResult>('/api/v1/ai/intent', {
      method: 'POST',
      body: { text },
    });
    return res;
  }, []);

  const getSummary = useCallback(async (userId: string): Promise<string> => {
    const res = await fetchApi<{ summary: string; message_count: number }>(
      `/api/v1/ai/summary/${userId}`,
    );
    return res.summary;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = null;
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sessionId: sessionIdRef.current,
    sendMessage,
    recognizeIntent,
    getSummary,
    clearMessages,
  };
}

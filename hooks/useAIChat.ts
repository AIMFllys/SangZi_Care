// ============================================================
// 桑梓智护 — AI对话 Hook
// 封装 MiMo 陪伴对话、意图识别、会话管理
// 需求: 4.8, 4.9, 4.10
// ============================================================

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import {
  AI_ACTION_TYPES,
  type AIAction,
  type AIActionStatus,
  type AIChatResult,
} from '@/types/ai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  actions?: AIAction[];
}

export interface IntentResult {
  intent: string;
  entities: Record<string, unknown>;
  confidence: number;
}

export interface UseAIChatReturn {
  /** 对话历史 */
  messages: ChatMessage[];
  /** 是否正在等待AI回复 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 当前会话ID */
  sessionId: string | null;
  /** 发送文字消息 */
  sendMessage: (text: string) => Promise<AIChatResult>;
  /** 识别意图 */
  recognizeIntent: (text: string) => Promise<IntentResult>;
  /** 获取对话摘要 */
  getSummary: (userId: string) => Promise<string>;
  /** 清空对话 */
  clearMessages: () => void;
  /** 中止当前仍在等待的 AI 回复 */
  cancelPending: () => void;
}

interface PendingChatRequest {
  id: number;
  controller: AbortController;
}

function createAbortError(): DOMException {
  return new DOMException('AI request cancelled', 'AbortError');
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

const ACTION_TYPE_SET = new Set<string>(AI_ACTION_TYPES);
const ACTION_STATUS_SET = new Set<string>(['success', 'warning', 'error']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** API 是运行时边界：只让已知、可读且状态一致的动作进入 UI。 */
export function normalizeAIActions(value: unknown): AIAction[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate): AIAction[] => {
    if (!isRecord(candidate)) return [];
    const { type, label } = candidate;
    if (
      typeof type !== 'string'
      || !ACTION_TYPE_SET.has(type)
      || typeof label !== 'string'
    ) {
      return [];
    }
    const normalizedLabel = label.trim();
    if (!normalizedLabel || Array.from(normalizedLabel).length > 120) return [];

    let status: AIActionStatus | null = null;
    if (candidate.status !== undefined) {
      if (typeof candidate.status !== 'string' || !ACTION_STATUS_SET.has(candidate.status)) {
        return [];
      }
      status = candidate.status as AIActionStatus;
      if (
        candidate.success !== undefined
        && (
          typeof candidate.success !== 'boolean'
          || candidate.success !== (status === 'success')
        )
      ) {
        return [];
      }
    } else if (typeof candidate.success === 'boolean') {
      status = candidate.success
        ? 'success'
        : type === 'share_consent_required' || type === 'no_family_recipients'
          ? 'warning'
          : 'error';
    }
    if (!status) return [];

    return [{
      type: type as AIAction['type'],
      label: normalizedLabel,
      status,
      success: status === 'success',
    }];
  });
}

export function useAIChat(): UseAIChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const pendingRef = useRef<PendingChatRequest | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  const cancelPending = useCallback((): void => {
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    pending.controller.abort();
    if (mountedRef.current) setIsLoading(false);
  }, []);

  const sendMessage = useCallback(async (text: string): Promise<AIChatResult> => {
    cancelPending();
    const request: PendingChatRequest = {
      id: ++requestIdRef.current,
      controller: new AbortController(),
    };
    pendingRef.current = request;
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

      const res = await fetchApi<{
        reply: string;
        session_id: string;
        actions?: unknown;
      }>(
        '/api/v1/ai/chat',
        {
          method: 'POST',
          body: {
            messages: chatMessages,
            session_id: sessionIdRef.current,
          },
          signal: request.controller.signal,
        },
      );

      if (pendingRef.current?.id !== request.id || request.controller.signal.aborted) {
        throw createAbortError();
      }

      sessionIdRef.current = res.session_id;
      const actions = normalizeAIActions(res.actions);

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: res.reply,
        timestamp: Date.now(),
        actions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      return { reply: res.reply, actions };
    } catch (err) {
      if (isAbortError(err)) throw err;
      const msg = err instanceof Error ? err.message : '对话失败';
      if (mountedRef.current && pendingRef.current?.id === request.id) {
        setError(msg);
      }
      throw err;
    } finally {
      if (pendingRef.current?.id === request.id) {
        pendingRef.current = null;
        if (mountedRef.current) setIsLoading(false);
      }
    }
  }, [cancelPending, messages]);

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
    cancelPending();
    setMessages([]);
    sessionIdRef.current = null;
    setError(null);
  }, [cancelPending]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      pendingRef.current?.controller.abort();
      pendingRef.current = null;
    };
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
    cancelPending,
  };
}

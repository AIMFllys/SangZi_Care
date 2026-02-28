// ============================================================
// 桑梓智护 — 带 Token 的 API 请求 Hook
// ============================================================

import { useMemo } from 'react';
import { fetchApi } from '@/lib/api';

/**
 * 封装带 Token 的 typed API 方法。
 *
 * Token 注入由 `fetchApi` 内部从 localStorage 读取，
 * 此 Hook 仅提供便捷的 HTTP 方法快捷方式。
 */
export function useApiClient() {
  return useMemo(
    () => ({
      get: <T>(path: string) => fetchApi<T>(path),

      post: <T>(path: string, body?: unknown) =>
        fetchApi<T>(path, { method: 'POST', body }),

      patch: <T>(path: string, body?: unknown) =>
        fetchApi<T>(path, { method: 'PATCH', body }),

      del: <T>(path: string) =>
        fetchApi<T>(path, { method: 'DELETE' }),
    }),
    [],
  );
}

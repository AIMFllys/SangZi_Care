// ============================================================
// 桑梓智护 — API 基础配置
// ============================================================

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface FetchApiOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * 轻量 fetch 封装
 * - 自动拼接 baseURL
 * - 自动注入 Bearer Token（从 localStorage 读取）
 * - 自动设置 Content-Type: application/json
 * - 非 2xx 响应抛出包含服务端 message 的 Error
 */
export async function fetchApi<T = unknown>(
  path: string,
  options: FetchApiOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers: extraHeaders } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  // 注入 Token（仅在浏览器环境）
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = `请求失败 (${res.status})`;
    try {
      const err = await res.json();
      if (err.detail) message = err.detail;
      else if (err.message) message = err.message;
    } catch {
      // 无法解析 JSON，使用默认消息
    }
    throw new Error(message);
  }

  // 204 No Content 等无 body 的响应
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export { API_BASE_URL };

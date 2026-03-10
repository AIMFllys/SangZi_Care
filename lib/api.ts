// ============================================================
// 桑梓智护 — API 基础配置（含 Token 自动续期）
// ============================================================

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface FetchApiOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** 跳过 token 注入（用于 refresh 等无需认证的请求） */
  skipAuth?: boolean;
}

/**
 * 是否正在刷新 Token（防并发）
 */
let _isRefreshing = false;
let _refreshPromise: Promise<boolean> | null = null;

/**
 * 用 refresh_token 换取新的 access + refresh token
 */
async function refreshTokens(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

/**
 * 轻量 fetch 封装
 * - 自动拼接 baseURL
 * - 自动注入 Bearer Token（从 localStorage 读取）
 * - 自动设置 Content-Type: application/json
 * - Token 过期时自动用 refresh_token 续期并重试
 * - 非 2xx 响应抛出包含服务端 message 的 Error
 */
export async function fetchApi<T = unknown>(
  path: string,
  options: FetchApiOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers: extraHeaders, skipAuth } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  // 注入 Token（仅在浏览器环境）
  if (typeof window !== 'undefined' && !skipAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${path}`;

  const fetchOptions: RequestInit = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let res = await fetch(url, fetchOptions);

  // Token 过期 → 自动续期并重试一次
  if (res.status === 401 && !skipAuth && typeof window !== 'undefined') {
    // 防止并发多次 refresh
    if (!_isRefreshing) {
      _isRefreshing = true;
      _refreshPromise = refreshTokens().finally(() => {
        _isRefreshing = false;
        _refreshPromise = null;
      });
    }

    const refreshed = await (_refreshPromise ?? refreshTokens());

    if (refreshed) {
      // 用新 token 重试
      const newToken = localStorage.getItem('token');
      if (newToken) {
        (fetchOptions.headers as Record<string, string>)['Authorization'] =
          `Bearer ${newToken}`;
      }
      res = await fetch(url, fetchOptions);
    }
  }

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

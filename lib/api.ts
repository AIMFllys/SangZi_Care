// ============================================================
// 桑梓智护 — API 基础配置（含 Token 自动续期）
// ============================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface FetchApiOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  /** 跳过 token 注入（用于 refresh 等无需认证的请求） */
  skipAuth?: boolean;
  signal?: AbortSignal;
}

interface FetchFormDataOptions {
  method?: 'POST' | 'PATCH';
  signal?: AbortSignal;
}

interface FetchBlobOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ApiError';
  }
}

type RefreshResult =
  | { kind: 'refreshed' }
  | { kind: 'invalid' }
  | { kind: 'unavailable'; error: ApiError };

let refreshPromise: Promise<RefreshResult> | null = null;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function createAbortError(): DOMException {
  return new DOMException('The operation was aborted', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw createAbortError();
}

/**
 * 只中止当前调用方对共享任务的等待，不取消共享任务本身。
 */
function waitWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(createAbortError());

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      cleanup();
      reject(createAbortError());
    };
    const cleanup = (): void => signal.removeEventListener('abort', onAbort);

    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        cleanup();
        reject(error);
      },
    );
  });
}

/** 用 refresh_token 换取新的 access + refresh token。 */
async function refreshTokens(): Promise<RefreshResult> {
  if (typeof window === 'undefined') return { kind: 'invalid' };
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return { kind: 'invalid' };

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch (error) {
    return {
      kind: 'unavailable',
      error: new ApiError('网络连接失败，请稍后重试', null, { cause: error }),
    };
  }

  if (!response.ok) {
    const error = await parseApiError(response);
    return error.status === 401
      ? { kind: 'invalid' }
      : { kind: 'unavailable', error };
  }

  try {
    const data = await response.json() as {
      access_token?: unknown;
      refresh_token?: unknown;
    };
    if (
      typeof data.access_token !== 'string'
      || typeof data.refresh_token !== 'string'
    ) {
      return {
        kind: 'unavailable',
        error: new ApiError('会话刷新响应无效', null),
      };
    }

    localStorage.setItem('token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    return { kind: 'refreshed' };
  } catch (error) {
    return {
      kind: 'unavailable',
      error: new ApiError('会话刷新响应无效', null, { cause: error }),
    };
  }
}

function getRefreshPromise(): Promise<RefreshResult> {
  if (!refreshPromise) {
    refreshPromise = refreshTokens().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function buildAttemptHeaders(
  baseHeaders: Headers,
  skipAuth: boolean,
): Headers {
  const headers = new Headers(baseHeaders);
  if (typeof window !== 'undefined' && !skipAuth) {
    const token = localStorage.getItem('token');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    else headers.delete('Authorization');
  }
  return headers;
}

async function parseApiError(response: Response): Promise<ApiError> {
  let message = `请求失败 (${response.status})`;
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.toLowerCase().includes('application/json')) {
    try {
      const body = await response.json() as {
        detail?: unknown;
        message?: unknown;
      };
      if (typeof body.detail === 'string' && body.detail.trim()) {
        message = body.detail;
      } else if (typeof body.message === 'string' && body.message.trim()) {
        message = body.message;
      }
    } catch {
      // 保留不包含上游响应正文的安全默认信息。
    }
  }

  return new ApiError(message, response.status);
}

async function performFetch(
  url: string,
  init: RequestInit,
  baseHeaders: Headers,
  skipAuth: boolean,
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      headers: buildAttemptHeaders(baseHeaders, skipAuth),
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError('网络连接失败，请稍后重试', null, {
      cause: error,
    });
  }
}

async function fetchAuthenticatedResponse(
  path: string,
  init: RequestInit,
  options: { skipAuth?: boolean } = {},
): Promise<Response> {
  const skipAuth = options.skipAuth ?? false;
  const signal = init.signal ?? undefined;
  const baseHeaders = new Headers(init.headers);
  const url = `${API_BASE_URL}${path}`;

  throwIfAborted(signal);
  let response = await performFetch(url, init, baseHeaders, skipAuth);

  if (response.status === 401 && !skipAuth && typeof window !== 'undefined') {
    const refreshResult = await waitWithAbort(getRefreshPromise(), signal);
    throwIfAborted(signal);
    if (refreshResult.kind === 'refreshed') {
      response = await performFetch(url, init, baseHeaders, skipAuth);
    } else if (refreshResult.kind === 'unavailable') {
      throw refreshResult.error;
    }
  }

  if (!response.ok) throw await parseApiError(response);
  return response;
}

/**
 * JSON API 封装：自动鉴权、401 单次续期、错误标准化。
 */
export async function fetchApi<T = unknown>(
  path: string,
  options: FetchApiOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers: extraHeaders,
    skipAuth = false,
    signal,
  } = options;
  const headers = new Headers(extraHeaders);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetchAuthenticatedResponse(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  }, { skipAuth });

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/** 上传 FormData；不得手工设置 Content-Type，以保留浏览器生成的 boundary。 */
export async function fetchFormData<T = unknown>(
  path: string,
  formData: FormData,
  options: FetchFormDataOptions = {},
): Promise<T> {
  const response = await fetchAuthenticatedResponse(path, {
    method: options.method ?? 'POST',
    body: formData,
    signal: options.signal,
  });

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/** 请求 JSON 接口并保留二进制响应。 */
export async function fetchBlob(
  path: string,
  options: FetchBlobOptions = {},
): Promise<Blob> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetchAuthenticatedResponse(path, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });
  return response.blob();
}

export { API_BASE_URL };

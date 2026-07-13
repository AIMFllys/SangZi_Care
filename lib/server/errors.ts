// ============================================================
// 桑梓智护 · 统一 API 错误响应与可抛出错误
// ------------------------------------------------------------
// - apiError / unauthorized / badRequest / notFound / forbidden...
//   返回 NextResponse，体为 { detail: string }，对齐 FastAPI HTTPException。
// - ApiError / throwApiError / toApiResponse：供 requireUser 及路由内
//   逻辑 throw，再由路由顶层 try/catch 统一转为 NextResponse。
// ============================================================

import { NextResponse } from 'next/server';
import { withPrivateNoStore } from './http';

export interface ApiErrorBody {
  detail: string;
}

/** 构造统一错误响应：{ detail } JSON + 指定状态码。 */
export function apiError(status: number, detail: string): NextResponse<ApiErrorBody> {
  return withPrivateNoStore(
    NextResponse.json<ApiErrorBody>({ detail }, { status }),
  );
}

export function unauthorized(
  detail = 'Missing authentication token',
): NextResponse<ApiErrorBody> {
  return apiError(401, detail);
}

export function badRequest(detail = 'Bad request'): NextResponse<ApiErrorBody> {
  return apiError(400, detail);
}

export function notFound(detail = 'Not found'): NextResponse<ApiErrorBody> {
  return apiError(404, detail);
}

export function forbidden(detail = 'Forbidden'): NextResponse<ApiErrorBody> {
  return apiError(403, detail);
}

export function internalError(
  detail = 'Internal server error',
): NextResponse<ApiErrorBody> {
  return apiError(500, detail);
}

/**
 * 可抛出的 API 错误。供 requireUser / 路由逻辑在深层 throw，
 * 由路由顶层 catch 后用 toApiResponse 统一转响应。
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

/** 抛出 ApiError（never returns）。 */
export function throwApiError(status: number, detail: string): never {
  throw new ApiError(status, detail);
}

/** 将捕获的异常转为 NextResponse；非 ApiError 退化为 500。 */
export function toApiResponse(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof ApiError) {
    return apiError(err.status, err.detail);
  }
  return internalError();
}

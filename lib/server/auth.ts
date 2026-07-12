// ============================================================
// 桑梓智护 · 服务端 JWT 签发与校验
// ------------------------------------------------------------
// 对齐 backend/core/security.py 与 backend/core/middleware.py：
//   - access token claims: sub、role、iat、exp(now + JWT_EXPIRE_MINUTES)
//   - refresh token claims: sub、role、type:"refresh"、iat、exp(now + 7d)
//     （Python refresh 不含 role；本实现按 plan 00 要求补 role，
//      便于 refresh 端点直接签发新 access，无需回查 DB。）
//   - requireUser: 解析 Authorization: Bearer，无效抛 401（用 errors.ts）。
// ============================================================

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { NextRequest } from 'next/server';
import { throwApiError } from './errors';
import {
  getJwtAlgorithm,
  getJwtExpireMinutes,
  getJwtRefreshExpireDays,
  getJwtSecret,
} from './env';

export interface AccessTokenInput {
  user_id: string;
  role: string;
}

export interface RefreshTokenInput {
  user_id: string;
  role: string;
}

export interface AuthUser {
  user_id: string;
  role: string;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

function algorithm(): string {
  return getJwtAlgorithm();
}

/**
 * 签发 access token。
 * claims: sub=user_id、role、iat、exp(now + JWT_EXPIRE_MINUTES)。
 * 对齐 Python create_access_token。
 */
export async function createAccessToken(input: AccessTokenInput): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + getJwtExpireMinutes() * 60;
  return new SignJWT({ role: input.role })
    .setProtectedHeader({ alg: algorithm() })
    .setSubject(input.user_id)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secretKey());
}

/**
 * 签发 refresh token。
 * claims: sub=user_id、role、type:"refresh"、iat、exp(now + 7d)。
 * 对齐 Python create_refresh_token（额外补 role）。
 */
export async function createRefreshToken(input: RefreshTokenInput): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + getJwtRefreshExpireDays() * 24 * 60 * 60;
  return new SignJWT({ role: input.role, type: 'refresh' })
    .setProtectedHeader({ alg: algorithm() })
    .setSubject(input.user_id)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(secretKey());
}

/**
 * 校验并解析 token；无效或过期返回 null。
 * 对齐 Python decode_token（抛错语义在此改为返回 null）。
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: [algorithm()],
    });
    return payload;
  } catch {
    return null;
  }
}

/**
 * 从请求中解析 Bearer token，返回 { user_id, role }。
 * 缺失 / 过期 / 无效 → 抛 401（通过 errors.throwApiError）。
 * 对齐 Python middleware.require_auth。
 */
export async function requireUser(request: NextRequest): Promise<AuthUser> {
  const header = request.headers.get('authorization');
  if (!header) {
    throwApiError(401, 'Missing authentication token');
  }

  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    throwApiError(401, 'Invalid authentication token');
  }

  const payload = await verifyToken(match[1]);
  if (!payload) {
    throwApiError(401, 'Token has expired or is invalid');
  }

  const user_id = payload.sub;
  const role = payload.role;
  if (!user_id) {
    throwApiError(401, "Token missing 'sub' claim");
  }
  if (typeof role !== 'string' || !role) {
    throwApiError(401, "Token missing 'role' claim");
  }

  return { user_id, role };
}

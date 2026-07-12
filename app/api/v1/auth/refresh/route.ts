// ============================================================
// POST /api/v1/auth/refresh
// ------------------------------------------------------------
// 对齐 backend/api/v1/auth.py · refresh
// body: { refresh_token }
// 校验 refresh token（type === "refresh"），签发新 access + refresh。
//
// 与 Python 差异（已由 plan 00 共享底座支持）：
//   - Python refresh token claims 不含 role，需回查 DB 取当前 role。
//   - 本实现 refresh token claims 已含 role（见 lib/server/auth.ts），
//     可直接用 claims 中的 role 签发新 access，无需回查 DB。
//   - 代价：若用户 role 在 refresh token 有效期内被更改，新 access 仍带旧 role；
//     access token 过期后下次 refresh 会带旧 role（因 refresh 也含旧 role）。
//     如需强一致，可在本端点回查 users 表覆盖 role（plan 02+ 可考虑）。
//
// 旧 refresh 是否吊销：
//   - 首版不吊销（与 Python 一致：Python 不维护吊销列表）。
//   - 旧 refresh 在到期前仍可换票，存在重放窗口；后续可引入 jti + 黑名单。
// ============================================================

import { NextResponse } from 'next/server';
import {
  ApiError,
  createAccessToken,
  createRefreshToken,
  toApiResponse,
  verifyToken,
} from '@/lib/server';

export const runtime = 'nodejs';

interface RefreshRequest {
  refresh_token?: unknown;
}

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RefreshRequest;
    const { refresh_token } = body;

    if (typeof refresh_token !== 'string' || refresh_token === '') {
      throw new ApiError(401, '无效的refresh token');
    }

    // --- 校验 token ---
    const payload = await verifyToken(refresh_token);
    if (!payload) {
      // 过期或无效（verifyToken 内部已捕获，统一返回 null）
      throw new ApiError(401, '无效的refresh token');
    }

    // --- 必须是 refresh 类型 ---
    if (payload.type !== 'refresh') {
      throw new ApiError(401, '无效的refresh token');
    }

    const user_id = payload.sub;
    const role = payload.role;
    if (typeof user_id !== 'string' || !user_id) {
      throw new ApiError(401, '无效的refresh token');
    }
    if (typeof role !== 'string' || !role) {
      throw new ApiError(401, '无效的refresh token');
    }

    // --- 签发新 access + refresh（不回查 DB，见文件头说明） ---
    const access_token = await createAccessToken({ user_id, role });
    const new_refresh_token = await createRefreshToken({ user_id, role });

    const res: RefreshResponse = {
      access_token,
      refresh_token: new_refresh_token,
    };
    return NextResponse.json(res);
  } catch (err) {
    return toApiResponse(err);
  }
}

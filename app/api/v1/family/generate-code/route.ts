// ============================================================
// POST /api/v1/family/generate-code
// ------------------------------------------------------------
// 对齐 backend/api/v1/family.py · generate_code
// 老年人端生成 6 位绑定码：在 elder_family_binds 创建 status='pending'
// 记录（family_id 留空，待家属兑码时回填）。
// 返回：{ bind_code, bind_id }
// ============================================================

import { randomInt } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
  withPrivateNoStore,
} from '@/lib/server';
import {
  assertExpectedRole,
  getDatabaseUserRole,
} from '../_lib';

export const runtime = 'nodejs';

interface GenerateCodeResponse {
  bind_code: string;
  bind_id: string;
  expires_at: string;
}

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await requireUser(request);
    const supabase = getSupabaseServerClient();
    const role = await getDatabaseUserRole(supabase, user_id);
    assertExpectedRole(role, 'elder');

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // RPC 在数据库事务内按长辈加锁、失效旧码并创建新码，确保并发请求
    // 最终也只有一个 pending 绑定码。
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const bind_code = randomInt(0, 1_000_000).toString().padStart(6, '0');
      const { data, error } = await supabase
        .rpc('oc_create_family_bind_code', {
          p_elder_id: user_id,
          p_bind_code: bind_code,
          p_expires_at: expiresAt,
        });

      if (!error && data) {
        return withPrivateNoStore(
          NextResponse.json<GenerateCodeResponse>({
            bind_code,
            bind_id: data,
            expires_at: expiresAt,
          }),
        );
      }
      if (error?.code !== '23505') {
        console.error('[POST /family/generate-code] 插入失败:', error);
        throw new ApiError(500, '生成绑定码失败');
      }
    }

    throw new ApiError(503, '暂时无法生成唯一绑定码，请稍后重试');
  } catch (err) {
    return toApiResponse(err);
  }
}

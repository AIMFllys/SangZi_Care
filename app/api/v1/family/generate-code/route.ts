// ============================================================
// POST /api/v1/family/generate-code
// ------------------------------------------------------------
// 对齐 backend/api/v1/family.py · generate_code
// 老年人端生成 6 位绑定码：在 elder_family_binds 创建 status='pending'
// 记录（family_id 留空，待家属兑码时回填）。
// 返回：{ bind_code, bind_id }
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import { generateBindCode, type FamilyBindInsert } from '../_lib';

export const runtime = 'nodejs';

interface GenerateCodeResponse {
  bind_code: string;
  bind_id: string;
}

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await requireUser(request);

    const bind_code = generateBindCode();
    const now = new Date().toISOString();

    // 注意：family_id 留空（migration-family-bind.sql 已将其改为可空），
    // relation 占位为 'pending'，待家属兑码时覆盖。
    const record: FamilyBindInsert = {
      elder_id: user_id,
      bind_code,
      status: 'pending',
      relation: 'pending',
      can_view_health: true,
      can_edit_medication: false,
      can_receive_emergency: true,
      created_at: now,
      bound_at: now,
    };

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('elder_family_binds')
      .insert(record)
      .select('*');

    if (error) {
      console.error('[POST /family/generate-code] 插入失败:', error);
      throw new ApiError(500, `生成绑定码失败: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new ApiError(500, '生成绑定码失败');
    }

    return NextResponse.json<GenerateCodeResponse>({
      bind_code,
      bind_id: data[0].id,
    });
  } catch (err) {
    return toApiResponse(err);
  }
}

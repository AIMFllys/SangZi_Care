// ============================================================
// PATCH / DELETE /api/v1/family/binds/{bind_id}
// ------------------------------------------------------------
// 对齐 backend/api/v1/family.py · update_bind / delete_bind
//   PATCH  : 仅允许长辈本人更新 active 绑定的权限子集
//   DELETE : 软解绑，置 status='inactive'
// 双方均可解绑；解绑后必须重新使用绑定码建立关系，不能恢复旧记录。
// 返回：PATCH → FamilyBindResponse；DELETE → { message }
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
  withPrivateNoStore,
} from '@/lib/server';
import {
  assertBindParticipant,
  assertCanManagePermissions,
  toBindResponse,
  type FamilyBindRow,
  type FamilyBindUpdate,
} from '../../_lib';

export const runtime = 'nodejs';

interface FamilyBindUpdateRequest {
  can_view_health?: unknown;
  can_edit_health?: unknown;
  can_edit_medication?: unknown;
  can_receive_emergency?: unknown;
}

interface DeleteBindResponse {
  message: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bind_id: string }> },
) {
  try {
    const { user_id: currentUserId } = await requireUser(request);
    const { bind_id } = await params;

    if (!bind_id) {
      throw new ApiError(400, 'bind_id 不能为空');
    }

    const body = (await request.json()) as FamilyBindUpdateRequest;

    const supabase = getSupabaseServerClient();
    const { data: existingRows, error: existingError } = await supabase
      .from('oc_elder_family_binds')
      .select('*')
      .eq('id', bind_id)
      .eq('status', 'active')
      .limit(1);
    if (existingError) {
      console.error('[PATCH /family/binds/:id] 查询失败:', existingError);
      throw new ApiError(500, '读取绑定关系失败');
    }
    if (!existingRows || existingRows.length === 0) {
      throw new ApiError(404, '绑定记录不存在');
    }
    const existing = existingRows[0] as FamilyBindRow;
    assertCanManagePermissions(existing, currentUserId);

    const update_data: FamilyBindUpdate = {};
    let changed = false;

    if (body.can_view_health !== undefined && body.can_view_health !== null) {
      if (typeof body.can_view_health !== 'boolean') {
        throw new ApiError(400, 'can_view_health 必须为布尔值');
      }
      update_data.can_view_health = body.can_view_health;
      changed = true;
    }
    if (body.can_edit_health !== undefined && body.can_edit_health !== null) {
      if (typeof body.can_edit_health !== 'boolean') {
        throw new ApiError(400, 'can_edit_health 必须为布尔值');
      }
      update_data.can_edit_health = body.can_edit_health;
      changed = true;
    }
    if (
      body.can_edit_medication !== undefined &&
      body.can_edit_medication !== null
    ) {
      if (typeof body.can_edit_medication !== 'boolean') {
        throw new ApiError(400, 'can_edit_medication 必须为布尔值');
      }
      update_data.can_edit_medication = body.can_edit_medication;
      changed = true;
    }
    if (
      body.can_receive_emergency !== undefined &&
      body.can_receive_emergency !== null
    ) {
      if (typeof body.can_receive_emergency !== 'boolean') {
        throw new ApiError(400, 'can_receive_emergency 必须为布尔值');
      }
      update_data.can_receive_emergency = body.can_receive_emergency;
      changed = true;
    }
    if (!changed) throw new ApiError(400, '没有需要更新的字段');

    const { data, error } = await supabase
      .from('oc_elder_family_binds')
      .update(update_data)
      .eq('id', bind_id)
      .eq('status', 'active')
      .select('*');

    if (error) {
      console.error('[PATCH /family/binds/:id] 更新失败:', error);
      throw new ApiError(500, '更新绑定权限失败');
    }

    if (!data || data.length === 0) {
      throw new ApiError(409, '绑定关系已变更，请刷新后重试');
    }

    return withPrivateNoStore(
      NextResponse.json(toBindResponse(data[0] as FamilyBindRow)),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bind_id: string }> },
) {
  try {
    const { user_id: currentUserId } = await requireUser(request);
    const { bind_id } = await params;

    if (!bind_id) {
      throw new ApiError(400, 'bind_id 不能为空');
    }

    const now = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    const { data: existingRows, error: existingError } = await supabase
      .from('oc_elder_family_binds')
      .select('*')
      .eq('id', bind_id)
      .eq('status', 'active')
      .limit(1);
    if (existingError) {
      console.error('[DELETE /family/binds/:id] 查询失败:', existingError);
      throw new ApiError(500, '读取绑定关系失败');
    }
    if (!existingRows || existingRows.length === 0) {
      throw new ApiError(404, '绑定记录不存在');
    }
    assertBindParticipant(existingRows[0] as FamilyBindRow, currentUserId);

    const { data, error } = await supabase
      .from('oc_elder_family_binds')
      .update({ status: 'inactive', bound_at: now })
      .eq('id', bind_id)
      .eq('status', 'active')
      .select('id');

    if (error) {
      console.error('[DELETE /family/binds/:id] 解绑失败:', error);
      throw new ApiError(500, '解除绑定失败');
    }

    if (!data || data.length === 0) {
      throw new ApiError(404, '绑定记录不存在');
    }

    return withPrivateNoStore(
      NextResponse.json<DeleteBindResponse>({ message: '绑定已解除' }),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}

// ============================================================
// PATCH / DELETE /api/v1/family/binds/{bind_id}
// ------------------------------------------------------------
// 对齐 backend/api/v1/family.py · update_bind / delete_bind
//   PATCH  : 更新权限子集（can_view_health / can_edit_medication /
//            can_receive_emergency / status），同时刷新 bound_at
//   DELETE : 软解绑，置 status='inactive'
// 权限对齐 Python：仅 requireUser 鉴权，不额外做归属校验。
// 返回：PATCH → FamilyBindResponse；DELETE → { message }
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import {
  toBindResponse,
  type FamilyBindRow,
  type FamilyBindUpdate,
} from '../../_lib';

export const runtime = 'nodejs';

interface FamilyBindUpdateRequest {
  can_view_health?: unknown;
  can_edit_medication?: unknown;
  can_receive_emergency?: unknown;
  status?: unknown;
}

interface DeleteBindResponse {
  message: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bind_id: string }> },
) {
  try {
    await requireUser(request);
    const { bind_id } = await params;

    if (!bind_id) {
      throw new ApiError(400, 'bind_id 不能为空');
    }

    const body = (await request.json()) as FamilyBindUpdateRequest;

    const now = new Date().toISOString();
    const update_data: FamilyBindUpdate = { bound_at: now };

    if (body.can_view_health !== undefined && body.can_view_health !== null) {
      if (typeof body.can_view_health !== 'boolean') {
        throw new ApiError(400, 'can_view_health 必须为布尔值');
      }
      update_data.can_view_health = body.can_view_health;
    }
    if (
      body.can_edit_medication !== undefined &&
      body.can_edit_medication !== null
    ) {
      if (typeof body.can_edit_medication !== 'boolean') {
        throw new ApiError(400, 'can_edit_medication 必须为布尔值');
      }
      update_data.can_edit_medication = body.can_edit_medication;
    }
    if (
      body.can_receive_emergency !== undefined &&
      body.can_receive_emergency !== null
    ) {
      if (typeof body.can_receive_emergency !== 'boolean') {
        throw new ApiError(400, 'can_receive_emergency 必须为布尔值');
      }
      update_data.can_receive_emergency = body.can_receive_emergency;
    }
    if (body.status !== undefined && body.status !== null) {
      if (typeof body.status !== 'string') {
        throw new ApiError(400, 'status 必须为字符串');
      }
      update_data.status = body.status;
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('elder_family_binds')
      .update(update_data)
      .eq('id', bind_id)
      .select('*');

    if (error) {
      console.error('[PATCH /family/binds/:id] 更新失败:', error);
      throw new ApiError(500, '更新绑定权限失败');
    }

    if (!data || data.length === 0) {
      throw new ApiError(500, '更新绑定权限失败');
    }

    return NextResponse.json(toBindResponse(data[0] as FamilyBindRow));
  } catch (err) {
    return toApiResponse(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bind_id: string }> },
) {
  try {
    await requireUser(request);
    const { bind_id } = await params;

    if (!bind_id) {
      throw new ApiError(400, 'bind_id 不能为空');
    }

    const now = new Date().toISOString();
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('elder_family_binds')
      .update({ status: 'inactive', bound_at: now })
      .eq('id', bind_id)
      .select('id');

    if (error) {
      console.error('[DELETE /family/binds/:id] 解绑失败:', error);
      throw new ApiError(500, '解除绑定失败');
    }

    if (!data || data.length === 0) {
      throw new ApiError(404, '绑定记录不存在');
    }

    return NextResponse.json<DeleteBindResponse>({ message: '绑定已解除' });
  } catch (err) {
    return toApiResponse(err);
  }
}

// ============================================================
// POST /api/v1/medicine/records
// ------------------------------------------------------------
// 对齐 backend/api/v1/medicine.py · create_record
//   - body.user_id 缺省回填当前用户（兼容 intentHandlers 不传 user_id
//     的调用）
//   - body.user_id ≠ 当前用户 → 需 active 绑定且 can_edit_medication=true
//     （plan 05 §2，家属代老人记录服药）
//   - status 缺省 'pending'；若 status='taken' 且 taken_at 未提供，
//     自动回填当前时间（对齐 Python）
//   - 自动设置 created_at
// 返回：MedicationRecordResponse(201)
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
  resolveMedicationTarget,
  toRecordResponse,
  type MedicationRecordInsert,
  type MedicationRecordResponse,
  type MedicationRecordRow,
} from '../_lib';

export const runtime = 'nodejs';

interface MedicationRecordCreateBody {
  user_id?: unknown;
  plan_id?: unknown;
  scheduled_time?: unknown;
  status?: unknown;
  taken_at?: unknown;
  delayed_count?: unknown;
  notes?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const body =
      (await request.json().catch(() => null)) as
        | MedicationRecordCreateBody
        | null;
    if (!body) {
      throw new ApiError(400, '请求体必须为 JSON');
    }

    // plan_id / scheduled_time 必填
    if (typeof body.plan_id !== 'string' || body.plan_id.trim() === '') {
      throw new ApiError(400, 'plan_id 不能为空');
    }
    const planId = body.plan_id;
    if (
      typeof body.scheduled_time !== 'string' ||
      body.scheduled_time.trim() === ''
    ) {
      throw new ApiError(400, 'scheduled_time 不能为空');
    }
    const scheduledTime = body.scheduled_time;

    // user_id 缺省回填当前用户
    const targetUserId =
      typeof body.user_id === 'string' && body.user_id.trim() !== ''
        ? body.user_id
        : currentUserId;

    // 跨用户写校验
    const supabase = getSupabaseServerClient();
    await resolveMedicationTarget(
      supabase,
      currentUserId,
      targetUserId,
      'edit',
    );

    // status 缺省 'pending'
    const status =
      typeof body.status === 'string' && body.status.trim() !== ''
        ? body.status
        : 'pending';

    // 可选字段
    const takenAtRaw =
      typeof body.taken_at === 'string' && body.taken_at.trim() !== ''
        ? body.taken_at
        : null;
    const delayedCount =
      typeof body.delayed_count === 'number' &&
      Number.isFinite(body.delayed_count)
        ? body.delayed_count
        : null;
    const notes =
      typeof body.notes === 'string' ? body.notes : null;

    const now = new Date().toISOString();
    // status='taken' 且未传 taken_at → 自动回填 now（对齐 Python）
    const takenAt =
      status === 'taken' ? (takenAtRaw ?? now) : takenAtRaw;

    const record: MedicationRecordInsert = {
      user_id: targetUserId,
      plan_id: planId,
      scheduled_time: scheduledTime,
      status,
      created_at: now,
      ...(takenAt !== null ? { taken_at: takenAt } : {}),
      ...(delayedCount !== null ? { delayed_count: delayedCount } : {}),
      ...(notes !== null ? { notes } : {}),
    };

    const { data, error } = await supabase
      .from('oc_medication_records')
      .insert(record)
      .select('*');

    if (error) {
      console.error('[POST /medicine/records] 创建失败:', error);
      throw new ApiError(500, '记录服药失败');
    }
    if (!data || data.length === 0) {
      throw new ApiError(500, '记录服药失败');
    }

    return withPrivateNoStore(
      NextResponse.json<MedicationRecordResponse>(
        toRecordResponse(data[0] as MedicationRecordRow),
        { status: 201 },
      ),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}

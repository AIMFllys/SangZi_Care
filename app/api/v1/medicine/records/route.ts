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
  type MedicationPlanRow,
} from '../_lib';
import {
  createScheduledAt,
  getCareDateInfo,
  normalizePlanTime,
} from '../_time';

export const runtime = 'nodejs';

const ALLOWED_STATUSES = new Set(['pending', 'taken', 'skipped', 'delayed']);

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
    const scheduledDate = new Date(body.scheduled_time);
    if (Number.isNaN(scheduledDate.getTime())) {
      throw new ApiError(400, 'scheduled_time 必须为完整的 ISO 时间');
    }
    const occurrence = getCareDateInfo(scheduledDate);
    // 数据库中的发生时间必须固定到计划分钟，避免客户端携带秒/毫秒
    // 绕过 (plan_id, scheduled_time) 唯一约束，或产生时间线无法匹配的记录。
    const scheduledTime = createScheduledAt(occurrence.date, occurrence.time);

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

    const { data: planRows, error: planError } = await supabase
      .from('oc_medication_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', targetUserId)
      .limit(1);
    if (planError) {
      console.error('[POST /medicine/records] 查询计划失败:', planError);
      throw new ApiError(500, '校验用药计划失败');
    }
    if (!planRows || planRows.length === 0) {
      throw new ApiError(404, '用药计划不存在或不属于该长辈');
    }
    const plan = planRows[0] as MedicationPlanRow;
    const planTimes = (plan.schedule_times ?? []).map(normalizePlanTime);
    if (!planTimes.includes(occurrence.time)) {
      throw new ApiError(400, '该时间不属于用药计划');
    }
    if (plan.start_date > occurrence.date || (plan.end_date && plan.end_date < occurrence.date)) {
      throw new ApiError(400, '该日期不在用药计划有效期内');
    }
    if (plan.repeat_days && !plan.repeat_days.includes(occurrence.weekday)) {
      throw new ApiError(400, '该日期不在用药计划重复日内');
    }

    // status 缺省 'pending'
    const status =
      typeof body.status === 'string' && body.status.trim() !== ''
        ? body.status
        : 'pending';
    if (!ALLOWED_STATUSES.has(status)) {
      throw new ApiError(400, 'status 必须为 pending、taken、skipped 或 delayed');
    }

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
      confirmed_by: currentUserId,
      ...(takenAt !== null ? { taken_at: takenAt } : {}),
      ...(delayedCount !== null ? { delayed_count: delayedCount } : {}),
      ...(notes !== null ? { notes } : {}),
    };

    const { data, error } = await supabase
      .from('oc_medication_records')
      .upsert(record, { onConflict: 'plan_id,scheduled_time' })
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

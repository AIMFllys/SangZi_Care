// ============================================================
// PATCH /api/v1/medicine/plans/{plan_id}
// ------------------------------------------------------------
// 对齐 backend/api/v1/medicine.py · update_plan
//   - 空更新体 → 400（对齐 Python "没有需要更新的字段"）
//   - 计划不存在 → 404
//   - 跨用户写（plan.user_id ≠ 当前用户）需 active 绑定且
//     can_edit_medication=true（plan 05 §2）
//   - 自动刷新 updated_at
//   - end_date / notes / side_effects 传 null 表示明确清空
//   - repeat_days 传空数组表示取消星期限制
// 返回：MedicationPlanResponse
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
  toPlanResponse,
  type MedicationPlanResponse,
  type MedicationPlanRow,
  type MedicationPlanUpdate,
} from '../../_lib';

export const runtime = 'nodejs';

interface MedicationPlanUpdateBody {
  medicine_name?: unknown;
  dosage?: unknown;
  schedule_times?: unknown;
  repeat_days?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  is_active?: unknown;
  unit?: unknown;
  notes?: unknown;
  side_effects?: unknown;
  remind_enabled?: unknown;
  remind_before_minutes?: unknown;
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function parsePlanDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, `${field} 必须为 YYYY-MM-DD 日期`);
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new ApiError(400, `${field} 必须为有效日期`);
  }
  return value;
}

function parseNullableText(value: unknown, field: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, `${field} 必须为字符串或 null`);
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function parseReminderMinutes(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 1440
  ) {
    throw new ApiError(
      400,
      'remind_before_minutes 必须为 0 到 1440 的整数',
    );
  }
  return value;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ plan_id: string }> },
) {
  try {
    const { user_id: currentUserId } = await requireUser(request);
    const { plan_id } = await params;

    if (!plan_id) {
      throw new ApiError(400, 'plan_id 不能为空');
    }

    const body =
      (await request.json().catch(() => null)) as
        | MedicationPlanUpdateBody
        | null;
    if (!body) {
      throw new ApiError(400, '请求体必须为 JSON');
    }

    const update_data: MedicationPlanUpdate = {};

    if (typeof body.medicine_name === 'string' && body.medicine_name !== '') {
      update_data.medicine_name = body.medicine_name;
    }
    if (typeof body.dosage === 'string' && body.dosage !== '') {
      update_data.dosage = body.dosage;
    }
    if (Array.isArray(body.schedule_times)) {
      for (const v of body.schedule_times) {
        if (typeof v !== 'string') {
          throw new ApiError(400, 'schedule_times 必须为字符串数组');
        }
      }
      update_data.schedule_times = body.schedule_times;
    }
    if (hasOwn(body, 'repeat_days')) {
      if (!Array.isArray(body.repeat_days)) {
        throw new ApiError(400, 'repeat_days 必须为数字数组');
      }
      for (const v of body.repeat_days) {
        if (!Number.isInteger(v) || v < 1 || v > 7) {
          throw new ApiError(400, 'repeat_days 只能包含 1 到 7 的整数');
        }
      }
      update_data.repeat_days = body.repeat_days;
    }
    if (hasOwn(body, 'start_date')) {
      update_data.start_date = parsePlanDate(body.start_date, 'start_date');
    }
    if (hasOwn(body, 'end_date')) {
      update_data.end_date =
        body.end_date === null
          ? null
          : parsePlanDate(body.end_date, 'end_date');
    }
    if (typeof body.is_active === 'boolean') {
      update_data.is_active = body.is_active;
    }
    if (typeof body.unit === 'string') {
      update_data.unit = body.unit;
    }
    if (hasOwn(body, 'notes')) {
      update_data.notes = parseNullableText(body.notes, 'notes');
    }
    if (hasOwn(body, 'side_effects')) {
      update_data.side_effects = parseNullableText(
        body.side_effects,
        'side_effects',
      );
    }
    if (hasOwn(body, 'remind_enabled')) {
      if (typeof body.remind_enabled !== 'boolean') {
        throw new ApiError(400, 'remind_enabled 必须为布尔值');
      }
      update_data.remind_enabled = body.remind_enabled;
    }
    if (hasOwn(body, 'remind_before_minutes')) {
      update_data.remind_before_minutes = parseReminderMinutes(
        body.remind_before_minutes,
      );
    }

    if (Object.keys(update_data).length === 0) {
      throw new ApiError(400, '没有需要更新的字段');
    }

    const supabase = getSupabaseServerClient();

    // 先查存在性 + 取 user_id 做权限校验
    const { data: existing, error: selectErr } = await supabase
      .from('oc_medication_plans')
      .select('id, user_id, start_date, end_date')
      .eq('id', plan_id)
      .limit(1);

    if (selectErr) {
      console.error('[PATCH /medicine/plans/:id] 查询失败:', selectErr);
      throw new ApiError(500, '更新用药计划失败');
    }
    if (!existing || existing.length === 0) {
      throw new ApiError(404, '用药计划不存在');
    }

    const planOwnerUserId = existing[0].user_id;
    await resolveMedicationTarget(
      supabase,
      currentUserId,
      planOwnerUserId,
      'edit',
    );

    const effectiveStartDate =
      update_data.start_date ?? existing[0].start_date;
    const effectiveEndDate = hasOwn(update_data, 'end_date')
      ? update_data.end_date
      : existing[0].end_date;
    if (effectiveEndDate && effectiveEndDate < effectiveStartDate) {
      throw new ApiError(400, '结束日期不能早于开始日期');
    }

    update_data.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('oc_medication_plans')
      .update(update_data)
      .eq('id', plan_id)
      .select('*');

    if (error) {
      console.error('[PATCH /medicine/plans/:id] 更新失败:', error);
      throw new ApiError(500, '更新用药计划失败');
    }
    if (!data || data.length === 0) {
      throw new ApiError(404, '用药计划不存在');
    }

    return withPrivateNoStore(
      NextResponse.json<MedicationPlanResponse>(
        toPlanResponse(data[0] as MedicationPlanRow),
      ),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}

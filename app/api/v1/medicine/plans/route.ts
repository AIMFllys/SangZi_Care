// ============================================================
// GET / POST /api/v1/medicine/plans
// ------------------------------------------------------------
// 对齐 backend/api/v1/medicine.py · get_plans / create_plan
//   GET  : 获取用药计划列表，可选 user_id / active_only(默认 true)
//          跨用户查询需 active 绑定且 can_view_health=true
//   POST : 创建用药计划，body.user_id 必填
//          若 body.user_id ≠ 当前用户 → 需 active 绑定且
//          can_edit_medication=true（plan 05 §2）
//          created_by 缺省回填当前用户
// 返回：GET → MedicationPlanResponse[]；POST → MedicationPlanResponse(201)
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
  type MedicationPlanInsert,
  type MedicationPlanResponse,
  type MedicationPlanRow,
} from '../_lib';

export const runtime = 'nodejs';

interface MedicationPlanCreateBody {
  user_id?: unknown;
  medicine_name?: unknown;
  dosage?: unknown;
  schedule_times?: unknown;
  start_date?: unknown;
  repeat_days?: unknown;
  end_date?: unknown;
  is_active?: unknown;
  created_by?: unknown;
  unit?: unknown;
  notes?: unknown;
  side_effects?: unknown;
  remind_enabled?: unknown;
  remind_before_minutes?: unknown;
}

function parseString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError(400, `${field} 不能为空`);
  }
  return value;
}

function parseOptionalString(
  value: unknown,
  field: string,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, `${field} 必须为字符串`);
  }
  return value;
}

function parseOptionalBoolean(
  value: unknown,
  field: string,
): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'boolean') {
    throw new ApiError(400, `${field} 必须为布尔值`);
  }
  return value;
}

function parseOptionalNumber(
  value: unknown,
  field: string,
): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ApiError(400, `${field} 必须为数字`);
  }
  return value;
}

function parseStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new ApiError(400, `${field} 必须为字符串数组`);
  }
  for (const v of value) {
    if (typeof v !== 'string') {
      throw new ApiError(400, `${field} 必须为字符串数组`);
    }
  }
  return value;
}

function parseOptionalNumberArray(
  value: unknown,
  field: string,
): number[] | null {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) {
    throw new ApiError(400, `${field} 必须为数字数组`);
  }
  for (const v of value) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new ApiError(400, `${field} 必须为数字数组`);
    }
  }
  return value;
}

// ---------------------------------------------------------------------------
// GET /api/v1/medicine/plans — 获取用药计划列表
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const params = request.nextUrl.searchParams;
    const requestedUserId = params.get('user_id');
    const activeOnlyParam = params.get('active_only');
    // 默认 true；显式 "false" 才关闭
    const activeOnly =
      activeOnlyParam === null || activeOnlyParam === 'true';

    const supabase = getSupabaseServerClient();
    const targetUserId = await resolveMedicationTarget(
      supabase,
      currentUserId,
      requestedUserId,
      'view',
    );

    let query = supabase
      .from('oc_medication_plans')
      .select('*')
      .eq('user_id', targetUserId);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) {
      console.error('[GET /medicine/plans] 查询失败:', error);
      throw new ApiError(500, '获取用药计划失败');
    }

    const rows = (data ?? []) as MedicationPlanRow[];
    return withPrivateNoStore(
      NextResponse.json<MedicationPlanResponse[]>(
        rows.map(toPlanResponse),
      ),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/medicine/plans — 创建用药计划
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const body =
      (await request.json().catch(() => null)) as
        | MedicationPlanCreateBody
        | null;
    if (!body) {
      throw new ApiError(400, '请求体必须为 JSON');
    }

    // 必填字段
    const targetUserId = parseString(body.user_id, 'user_id');
    const medicineName = parseString(body.medicine_name, 'medicine_name');
    const dosage = parseString(body.dosage, 'dosage');
    const scheduleTimes = parseStringArray(
      body.schedule_times,
      'schedule_times',
    );
    const startDate = parseString(body.start_date, 'start_date');

    // 跨用户写校验：目标 user_id ≠ 当前用户 → 需 can_edit_medication
    const supabase = getSupabaseServerClient();
    await resolveMedicationTarget(
      supabase,
      currentUserId,
      targetUserId,
      'edit',
    );

    // 可选字段
    const repeatDays = parseOptionalNumberArray(
      body.repeat_days,
      'repeat_days',
    );
    const endDate = parseOptionalString(body.end_date, 'end_date');
    const isActive = parseOptionalBoolean(body.is_active, 'is_active');
    const createdByRaw = parseOptionalString(body.created_by, 'created_by');
    const unit = parseOptionalString(body.unit, 'unit');
    const notes = parseOptionalString(body.notes, 'notes');
    const sideEffects = parseOptionalString(
      body.side_effects,
      'side_effects',
    );
    const remindEnabled = parseOptionalBoolean(
      body.remind_enabled,
      'remind_enabled',
    );
    const remindBeforeMinutes = parseOptionalNumber(
      body.remind_before_minutes,
      'remind_before_minutes',
    );

    // created_by 缺省回填当前用户（对齐 Python）
    const createdBy = createdByRaw ?? currentUserId;

    const now = new Date().toISOString();
    const record: MedicationPlanInsert = {
      user_id: targetUserId,
      medicine_name: medicineName,
      dosage,
      schedule_times: scheduleTimes,
      start_date: startDate,
      created_at: now,
      updated_at: now,
      created_by: createdBy,
      ...(repeatDays !== null ? { repeat_days: repeatDays } : {}),
      ...(endDate !== null ? { end_date: endDate } : {}),
      ...(isActive !== null ? { is_active: isActive } : {}),
      ...(unit !== null ? { unit } : {}),
      ...(notes !== null ? { notes } : {}),
      ...(sideEffects !== null ? { side_effects: sideEffects } : {}),
      ...(remindEnabled !== null ? { remind_enabled: remindEnabled } : {}),
      ...(remindBeforeMinutes !== null
        ? { remind_before_minutes: remindBeforeMinutes }
        : {}),
    };

    const { data, error } = await supabase
      .from('oc_medication_plans')
      .insert(record)
      .select('*');

    if (error) {
      console.error('[POST /medicine/plans] 创建失败:', error);
      throw new ApiError(500, '创建用药计划失败');
    }
    if (!data || data.length === 0) {
      throw new ApiError(500, '创建用药计划失败');
    }

    return withPrivateNoStore(
      NextResponse.json<MedicationPlanResponse>(
        toPlanResponse(data[0] as MedicationPlanRow),
        { status: 201 },
      ),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}

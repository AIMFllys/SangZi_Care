// ============================================================
// 桑梓智护 · medicine 域共享类型与跨用户权限校验（仅服务端）
// ------------------------------------------------------------
// 对齐 backend/api/v1/medicine.py 与 backend/models/medicine.py。
// 鉴权增强（相对 Python 现状，见 plan 05 §2）：
//   - 读 plans/today：目标 user_id ≠ 当前用户时，需 active 绑定且
//     can_view_health=true（与 plan 04 健康读一致，能看健康就能看药）。
//   - 写 plans/records：目标 user_id ≠ 当前用户时，需 active 绑定且
//     can_edit_medication=true（plan 05 §2 明确要求）。
// 表结构以 types/supabase.ts 为准（elder_family_binds 使用独立布尔列
// can_view_health/can_edit_medication/can_receive_emergency，不是
// Python 代码里假设的 permissions JSON 对象 —— Python 实现存在 bug，
// 本实现按表真相修正）。
// ============================================================

import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { throwApiError } from '@/lib/server';

export type MedicationPlanRow =
  Database['public']['Tables']['oc_medication_plans']['Row'];
export type MedicationPlanInsert =
  Database['public']['Tables']['oc_medication_plans']['Insert'];
export type MedicationPlanUpdate =
  Database['public']['Tables']['oc_medication_plans']['Update'];

export type MedicationRecordRow =
  Database['public']['Tables']['oc_medication_records']['Row'];
export type MedicationRecordInsert =
  Database['public']['Tables']['oc_medication_records']['Insert'];

/** 对齐 Python MedicationPlanResponse / 前端 medicineStore.MedicationPlanResponse。 */
export interface MedicationPlanResponse {
  id: string;
  user_id: string;
  medicine_name: string;
  dosage: string;
  schedule_times: string[];
  repeat_days: number[] | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean | null;
  created_by: string | null;
  unit: string | null;
  notes: string | null;
  side_effects: string | null;
  remind_enabled: boolean | null;
  remind_before_minutes: number | null;
  created_at: string | null;
  updated_at: string | null;
}

/** 对齐 Python MedicationRecordResponse / 前端 medicineStore.MedicationRecordResponse。 */
export interface MedicationRecordResponse {
  id: string;
  user_id: string;
  plan_id: string;
  scheduled_time: string;
  status: string | null;
  taken_at: string | null;
  delayed_count: number | null;
  notes: string | null;
  created_at: string | null;
}

export type MedicationStatus = 'pending' | 'taken' | 'skipped' | 'delayed';

/** 对齐 Python TodayTimelineItem。 */
export interface TodayTimelineItem {
  plan: MedicationPlanResponse;
  scheduled_time: string;
  record: MedicationRecordResponse | null;
  status: MedicationStatus;
}

/** 对齐 Python TodayTimelineResponse。 */
export interface TodayTimelineResponse {
  date: string;
  items: TodayTimelineItem[];
}

/** 对齐 Python NotifyFamilyRequest。 */
export interface NotifyFamilyRequest {
  user_id: string;
  plan_id: string;
  scheduled_time: string;
}

/** 对齐 Python NotifyFamilyResponse。 */
export interface NotifyFamilyResponse {
  message: string;
  notified_count: number;
  notified_family_ids: string[];
}

/** 将 medication_plans 行映射为响应体。 */
export function toPlanResponse(row: MedicationPlanRow): MedicationPlanResponse {
  return {
    id: row.id,
    user_id: row.user_id,
    medicine_name: row.medicine_name,
    dosage: row.dosage,
    schedule_times: row.schedule_times ?? [],
    repeat_days: row.repeat_days,
    start_date: row.start_date,
    end_date: row.end_date,
    is_active: row.is_active,
    created_by: row.created_by,
    unit: row.unit,
    notes: row.notes,
    side_effects: row.side_effects,
    remind_enabled: row.remind_enabled,
    remind_before_minutes: row.remind_before_minutes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** 将 medication_records 行映射为响应体。 */
export function toRecordResponse(
  row: MedicationRecordRow,
): MedicationRecordResponse {
  return {
    id: row.id,
    user_id: row.user_id,
    plan_id: row.plan_id,
    scheduled_time: row.scheduled_time,
    status: row.status,
    taken_at: row.taken_at,
    delayed_count: row.delayed_count,
    notes: row.notes,
    created_at: row.created_at,
  };
}

/**
 * 解析用药数据查询/写入的目标用户 id，并校验跨用户可见性。
 *
 * - requestedUserId 为空或等于当前用户 → 返回当前用户（看自己/写自己）。
 * - mode='view'：需存在 active 绑定且 can_view_health=true（家属只读）。
 * - mode='edit'：需存在 active 绑定且 can_edit_medication=true（家属代管药）。
 *   不满足 → 抛 403。
 *
 * 对齐 plan 05 §2 鉴权增强（Python 现状无此校验）。
 */
export async function resolveMedicationTarget(
  supabase: SupabaseClient<Database>,
  currentUserId: string,
  requestedUserId: string | null,
  mode: 'view' | 'edit',
): Promise<string> {
  if (!requestedUserId || requestedUserId === currentUserId) {
    return currentUserId;
  }

  const permissionColumn =
    mode === 'edit' ? 'can_edit_medication' : 'can_view_health';

  const { data, error } = await supabase
    .from('oc_elder_family_binds')
    .select('id')
    .eq('family_id', currentUserId)
    .eq('elder_id', requestedUserId)
    .eq(permissionColumn, true)
    .eq('status', 'active')
    .limit(1);

  if (error) {
    console.error('[medicine] 校验家庭绑定失败:', error);
    throwApiError(500, '校验家庭绑定失败');
  }

  if (!data || data.length === 0) {
    throwApiError(
      403,
      mode === 'edit'
        ? '无权管理该用户的用药'
        : '无权查看该用户的用药',
    );
  }

  return requestedUserId;
}

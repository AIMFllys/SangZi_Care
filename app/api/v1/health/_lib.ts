// ============================================================
// 桑梓智护 · health 域共享类型与跨用户可见性校验（仅服务端）
// ------------------------------------------------------------
// 对齐 backend/api/v1/health.py 与 backend/models/health.py。
// 鉴权增强（相对 Python 现状，见 plan 04 §3）：
//   - 查询/写入目标 user_id ≠ 当前用户时，必须存在 active 绑定
//     且 can_view_health=true（家属只读）。
//   - 写入：默认仅本人可写（body.user_id 必须等于当前用户）。
// ============================================================

import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { throwApiError } from '@/lib/server';

export type HealthRecordRow =
  Database['public']['Tables']['health_records']['Row'];
export type HealthRecordInsert =
  Database['public']['Tables']['health_records']['Insert'];

/** 对齐 Python HealthRecordResponse。 */
export interface HealthRecordResponse {
  id: string;
  user_id: string;
  record_type: string;
  values: Record<string, unknown>;
  measured_at: string;
  input_method: string | null;
  recorded_by: string | null;
  is_abnormal: boolean | null;
  abnormal_reason: string | null;
  notes: string | null;
  symptoms: string | null;
  created_at: string | null;
}

/** 将 health_records 行映射为响应体。 */
export function toRecordResponse(row: HealthRecordRow): HealthRecordResponse {
  return {
    id: row.id,
    user_id: row.user_id,
    record_type: row.record_type,
    values: (row.values ?? {}) as Record<string, unknown>,
    measured_at: row.measured_at,
    input_method: row.input_method,
    recorded_by: row.recorded_by,
    is_abnormal: row.is_abnormal,
    abnormal_reason: row.abnormal_reason,
    notes: row.notes,
    symptoms: row.symptoms,
    created_at: row.created_at,
  };
}

/**
 * 解析健康数据查询的目标用户 id，并校验跨用户可见性。
 *
 * - requestedUserId 为空或等于当前用户 → 返回当前用户（看自己）。
 * - 否则必须在 elder_family_binds 中存在 active 绑定：
 *     family_id = 当前用户、elder_id = requestedUserId、
 *     can_view_health = true、status = 'active'。
 *   不满足 → 抛 403。
 *
 * 对齐 plan 04 §3 鉴权增强（Python 现状无此校验）。
 */
export async function resolveHealthTarget(
  supabase: SupabaseClient<Database>,
  currentUserId: string,
  requestedUserId: string | null,
): Promise<string> {
  if (!requestedUserId || requestedUserId === currentUserId) {
    return currentUserId;
  }

  const { data, error } = await supabase
    .from('elder_family_binds')
    .select('id')
    .eq('family_id', currentUserId)
    .eq('elder_id', requestedUserId)
    .eq('can_view_health', true)
    .eq('status', 'active')
    .limit(1);

  if (error) {
    console.error('[health] 校验家庭绑定失败:', error);
    throwApiError(500, '校验家庭绑定失败');
  }

  if (!data || data.length === 0) {
    throwApiError(403, '无权查看该用户的健康数据');
  }

  return requestedUserId;
}

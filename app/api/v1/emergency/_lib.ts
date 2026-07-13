// ============================================================
// 桑梓智护 · emergency 域共享类型与映射（仅服务端，非路由文件）
// ------------------------------------------------------------
// 对齐 backend/api/v1/emergency.py 与 backend/models/emergency.py。
// 表结构以 types/supabase.ts 为准（emergency_calls 表）。
//
// 修复项（plan 10 §3）：
//   - 通知对象解析使用 elder_family_binds.can_receive_emergency 布尔列，
//     不是 Python 代码里假设的 permissions.receive_emergency_notifications
//     JSON 字段（types/supabase.ts 为准，Python 现状存在 bug）。
//   - 关系字段使用 elder_family_binds.relation（非 Python 假设的 relationship）。
// ============================================================

import type { Database, Json } from '@/types/supabase';

export type EmergencyCallRow =
  Database['public']['Tables']['oc_emergency_calls']['Row'];
export type EmergencyCallInsert =
  Database['public']['Tables']['oc_emergency_calls']['Insert'];
export type EmergencyCallUpdate =
  Database['public']['Tables']['oc_emergency_calls']['Update'];

/** 对齐 Python EmergencyCallResponse / 前端契约。 */
export interface EmergencyCallResponse {
  id: string;
  user_id: string;
  trigger_method: string;
  status: string | null;
  called_numbers: string[] | null;
  called_contacts: Json | null;
  notified_families: string[] | null;
  location: Json | null;
  triggered_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  cancel_reason: string | null;
  cancelled_by: string | null;
  recording_url: string | null;
  recording_duration: number | null;
  notification_sent_at: string | null;
  created_at: string | null;
}

/** 将 emergency_calls 行映射为响应体。 */
export function toCallResponse(row: EmergencyCallRow): EmergencyCallResponse {
  return {
    id: row.id,
    user_id: row.user_id,
    trigger_method: row.trigger_method,
    status: row.status,
    called_numbers: row.called_numbers,
    called_contacts: row.called_contacts,
    notified_families: row.notified_families,
    location: row.location,
    triggered_at: row.triggered_at,
    answered_at: row.answered_at,
    ended_at: row.ended_at,
    cancel_reason: row.cancel_reason,
    cancelled_by: row.cancelled_by,
    recording_url: row.recording_url,
    recording_duration: row.recording_duration,
    notification_sent_at: row.notification_sent_at,
    created_at: row.created_at,
  };
}

/** called_contacts 单个家属条目结构（对齐 Python trigger 写入）。 */
export interface CalledContactEntry {
  relation: string | null;
  family_id: string;
}

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
  request_id: string | null;
  notification_sent_at: string | null;
  created_at: string | null;
}

export type EmergencyNotificationStatus = 'sent' | 'no_recipients';

export interface EmergencyTriggerResponse extends EmergencyCallResponse {
  notification_status: EmergencyNotificationStatus;
  recipient_count: number;
  replayed: boolean;
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
    request_id: row.request_id,
    notification_sent_at: row.notification_sent_at,
    created_at: row.created_at,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

export function parseTriggerRpcResult(
  value: Json,
  expected: { elderId: string; requestId: string; triggerMethod: 'button' | 'voice' },
): EmergencyTriggerResponse {
  if (!isRecord(value) || !isRecord(value.call)) {
    throw new Error('invalid emergency RPC response');
  }
  const call = value.call;
  const notificationStatus = value.notification_status;
  const recipientCount = value.recipient_count;
  if (
    typeof call.id !== 'string'
    || typeof call.user_id !== 'string'
    || typeof call.request_id !== 'string'
    || typeof call.trigger_method !== 'string'
    || !isNullableString(call.status)
    || !Array.isArray(call.called_numbers)
    || call.called_numbers.some((item) => typeof item !== 'string')
    || !Array.isArray(call.notified_families)
    || call.notified_families.some((item) => typeof item !== 'string')
    || !isRecord(call.called_contacts)
    || (call.location !== null && !isRecord(call.location))
    || !isNullableString(call.triggered_at)
    || !isNullableString(call.answered_at)
    || !isNullableString(call.ended_at)
    || !isNullableString(call.cancel_reason)
    || !isNullableString(call.cancelled_by)
    || !isNullableString(call.recording_url)
    || !isNullableNumber(call.recording_duration)
    || !isNullableString(call.notification_sent_at)
    || !isNullableString(call.created_at)
    || (notificationStatus !== 'sent' && notificationStatus !== 'no_recipients')
    || typeof recipientCount !== 'number'
    || !Number.isSafeInteger(recipientCount)
    || recipientCount < 0
    || typeof value.replayed !== 'boolean'
    || call.user_id !== expected.elderId
    || call.request_id !== expected.requestId
    || call.trigger_method !== expected.triggerMethod
    || call.notified_families.length !== recipientCount
    || (notificationStatus === 'sent' && call.notification_sent_at === null)
    || (notificationStatus === 'no_recipients' && call.notification_sent_at !== null)
    || (notificationStatus === 'sent' && recipientCount === 0)
    || (notificationStatus === 'no_recipients' && recipientCount !== 0)
  ) {
    throw new Error('invalid emergency RPC response');
  }

  return {
    ...toCallResponse(call as unknown as EmergencyCallRow),
    notification_status: notificationStatus,
    recipient_count: recipientCount,
    replayed: value.replayed,
  };
}

/** called_contacts 单个家属条目结构（对齐 Python trigger 写入）。 */
export interface CalledContactEntry {
  relation: string | null;
  family_id: string;
}

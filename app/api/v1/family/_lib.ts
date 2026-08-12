// ============================================================
// 桑梓智护 · family 域共享类型与映射（仅服务端，非路由文件）
// ------------------------------------------------------------
// 对齐 backend/api/v1/family.py · _db_row_to_response / _generate_bind_code
// 与 backend/models/user.py · FamilyBindResponse
// ============================================================

import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { throwApiError } from '@/lib/server';

export type FamilyBindRow =
  Database['public']['Tables']['oc_elder_family_binds']['Row'];
export type FamilyBindInsert =
  Database['public']['Tables']['oc_elder_family_binds']['Insert'];
export type FamilyBindUpdate =
  Database['public']['Tables']['oc_elder_family_binds']['Update'];

/** 对齐 Python FamilyBindResponse。 */
export interface FamilyBindResponse {
  id: string;
  elder_id: string;
  family_id: string;
  relation: string;
  status: string | null;
  bind_code: string | null;
  can_view_health: boolean;
  can_edit_medication: boolean;
  can_receive_emergency: boolean;
  bound_at: string | null;
  created_at: string | null;
  expires_at: string | null;
  can_edit_health: boolean;
  peer: FamilyPeer | null;
  contact_preference: ContactPreferenceResponse;
}

export interface ContactPreferenceResponse {
  alias: string | null;
  is_pinned: boolean;
}

export interface FamilyPeer {
  id: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  last_active_at: string | null;
  role: string;
}

export type FamilyPeerRow = Pick<
  Database['public']['Tables']['oc_users']['Row'],
  'id' | 'name' | 'phone' | 'avatar_url' | 'last_active_at' | 'role'
>;

/**
 * 将 elder_family_binds 行映射为 FamilyBindResponse。
 * 对齐 Python _db_row_to_response：null 退化为默认值（"" / false）。
 */
export function toBindResponse(
  row: FamilyBindRow,
  peer: FamilyPeerRow | null = null,
  contactPreference: ContactPreferenceResponse = { alias: null, is_pinned: false },
): FamilyBindResponse {
  return {
    id: row.id,
    elder_id: row.elder_id ?? '',
    family_id: row.family_id ?? '',
    relation: row.relation ?? '',
    status: row.status ?? null,
    bind_code: row.bind_code ?? null,
    can_view_health: row.can_view_health ?? false,
    can_edit_medication: row.can_edit_medication ?? false,
    can_receive_emergency: row.can_receive_emergency ?? false,
    bound_at: row.bound_at ?? null,
    created_at: row.created_at ?? null,
    expires_at: row.expires_at ?? null,
    can_edit_health: row.can_edit_health ?? false,
    peer,
    contact_preference: contactPreference,
  };
}

export function assertExpectedRole(actualRole: string, expectedRole: 'elder' | 'family'): void {
  if (actualRole !== expectedRole) {
    throwApiError(
      403,
      expectedRole === 'elder' ? '仅长辈账号可执行此操作' : '仅家属账号可执行此操作',
    );
  }
}

export function assertBindParticipant(row: FamilyBindRow, userId: string): void {
  if (row.elder_id !== userId && row.family_id !== userId) {
    throwApiError(403, '无权操作该绑定关系');
  }
}

export function assertCanManagePermissions(row: FamilyBindRow, userId: string): void {
  assertBindParticipant(row, userId);
  if (row.elder_id !== userId) {
    throwApiError(403, '只有长辈本人可以调整监护权限');
  }
}

export async function getDatabaseUserRole(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('oc_users')
    .select('role')
    .eq('id', userId)
    .limit(1);
  if (error) {
    console.error('[family] 查询用户角色失败:', error);
    throwApiError(500, '校验账号角色失败');
  }
  if (!data || data.length === 0) throwApiError(404, '用户不存在');
  return data[0].role;
}

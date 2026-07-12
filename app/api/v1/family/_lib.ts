// ============================================================
// 桑梓智护 · family 域共享类型与映射（仅服务端，非路由文件）
// ------------------------------------------------------------
// 对齐 backend/api/v1/family.py · _db_row_to_response / _generate_bind_code
// 与 backend/models/user.py · FamilyBindResponse
// ============================================================

import type { Database } from '@/types/supabase';

export type FamilyBindRow =
  Database['public']['Tables']['elder_family_binds']['Row'];
export type FamilyBindInsert =
  Database['public']['Tables']['elder_family_binds']['Insert'];
export type FamilyBindUpdate =
  Database['public']['Tables']['elder_family_binds']['Update'];

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
}

/**
 * 将 elder_family_binds 行映射为 FamilyBindResponse。
 * 对齐 Python _db_row_to_response：null 退化为默认值（"" / false）。
 */
export function toBindResponse(row: FamilyBindRow): FamilyBindResponse {
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
  };
}

/** 生成 6 位数字绑定码。对齐 Python _generate_bind_code（非加密随机）。 */
export function generateBindCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

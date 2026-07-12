// ============================================================
// 桑梓智护 · 服务端 Supabase 客户端
// ------------------------------------------------------------
// 使用 SUPABASE_SECRET_KEY（sb_secret_...，绕过 RLS）+
// NEXT_PUBLIC_SUPABASE_URL 构造。
// 严禁在客户端代码 import 本文件；secret 绝不进 NEXT_PUBLIC_*。
// 对齐 backend/services/supabase_client.py 的服务端写权限语义。
// ============================================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { getSupabaseSecretKey, getSupabaseUrl } from './env';

let _client: SupabaseClient<Database> | null = null;

/**
 * 获取服务端 Supabase 客户端单例。
 * - 使用 secret key，绕过 RLS（与 Python service_role 等价）。
 * - 关闭 autoRefreshToken / persistSession，避免服务端无谓的会话持久化。
 */
export function getSupabaseServerClient(): SupabaseClient<Database> {
  if (_client) return _client;
  const url = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  _client = createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _client;
}

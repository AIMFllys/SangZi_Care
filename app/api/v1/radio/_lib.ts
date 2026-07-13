// ============================================================
// 桑梓智护 · radio 域共享类型与映射器（仅服务端，非路由文件）
// ------------------------------------------------------------
// 文件名以 _ 前缀开头，避免被 Next.js App Router 当作路由处理。
// 对齐 backend/models/broadcast.py（Pydantic 模型）与
// types/supabase.ts 的 health_broadcasts / broadcast_play_history 表。
// 前端契约：stores/radioStore.ts 的 BroadcastResponse / CategoryInfo。
// ============================================================

import type { Database } from '@/types/supabase';

// ---------- Supabase 行 / 插入类型 ----------

export type BroadcastRow =
  Database['public']['Tables']['oc_health_broadcasts']['Row'];
export type BroadcastInsert =
  Database['public']['Tables']['oc_health_broadcasts']['Insert'];
export type PlayHistoryRow =
  Database['public']['Tables']['oc_broadcast_play_history']['Row'];
export type PlayHistoryInsert =
  Database['public']['Tables']['oc_broadcast_play_history']['Insert'];
export type UsersRow = Database['public']['Tables']['oc_users']['Row'];

// ---------- 响应 / 请求类型（对齐前端 stores/radioStore.ts） ----------

/** 健康广播响应模型（对齐 Python BroadcastResponse + 前端 BroadcastResponse）。 */
export interface BroadcastResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  audio_url: string | null;
  audio_duration: number | null;
  play_count: number | null;
  is_published: boolean | null;
  target_age_min: number | null;
  target_age_max: number | null;
  target_diseases: string[] | null;
  target_season: string | null;
  ai_prompt: string | null;
  generated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** 广播分类项（对齐前端 CategoryInfo）。 */
export interface CategoryInfo {
  key: string;
  name: string;
  description: string;
}

/** GET /radio/recommend 查询参数。 */
export interface RadioLimitQuery {
  limit: number;
}

/** POST /radio/play-record 请求体（对齐 Python PlayRecordCreate）。 */
export interface PlayRecordRequest {
  broadcast_id: string;
  play_duration?: number | null;
  completed?: boolean | null;
  liked?: boolean | null;
}

/** POST /radio/play-record 响应体（对齐 Python PlayRecordResponse）。 */
export interface PlayRecordResponse {
  id: string;
  user_id: string;
  broadcast_id: string;
  played_at: string | null;
  play_duration: number | null;
  completed: boolean | null;
  liked: boolean | null;
  created_at: string | null;
}

/** POST /radio/generate 请求体（对齐 Python BroadcastGenerateRequest）。 */
export interface GenerateRequest {
  category: string;
  topic?: string | null;
  target_age_min?: number | null;
  target_age_max?: number | null;
  target_diseases?: string[] | null;
}

// ---------- 行 → 响应映射器 ----------

/** health_broadcasts 行 → BroadcastResponse。字段一一对应，显式映射以处理 null。 */
export function toBroadcastResponse(row: BroadcastRow): BroadcastResponse {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    category: row.category,
    audio_url: row.audio_url,
    audio_duration: row.audio_duration,
    play_count: row.play_count,
    is_published: row.is_published,
    target_age_min: row.target_age_min,
    target_age_max: row.target_age_max,
    target_diseases: row.target_diseases,
    target_season: row.target_season,
    ai_prompt: row.ai_prompt,
    generated_by: row.generated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** broadcast_play_history 行 → PlayRecordResponse。 */
export function toPlayRecordResponse(row: PlayHistoryRow): PlayRecordResponse {
  return {
    id: row.id,
    user_id: row.user_id,
    broadcast_id: row.broadcast_id,
    played_at: row.played_at,
    play_duration: row.play_duration,
    completed: row.completed,
    liked: row.liked,
    created_at: row.created_at,
  };
}

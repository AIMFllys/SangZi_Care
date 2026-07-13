// ============================================================
// GET /api/v1/radio/recommend
// ------------------------------------------------------------
// 对齐 backend/api/v1/radio.py · get_recommendations
//   1. requireUser 鉴权
//   2. 取当前用户 birth_date / chronic_diseases
//   3. buildRecommendFilters → { age, diseases, season }
//   4. 查 health_broadcasts where is_published=true，
//      season 非空时 or(target_season.eq.{season}, target_season.is.null)
//   5. order created_at desc + limit
// 返回：BroadcastResponse[]
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  getVoiceBucketName,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import { buildRecommendFilters } from '@/lib/server/broadcast';
import { toBroadcastResponse } from '../_lib';
import type { BroadcastResponse, BroadcastRow, UsersRow } from '../_lib';
import { withPrivateNoStore } from '../../_http';

export const runtime = 'nodejs';

const SIGNED_URL_TTL_SECONDS = 600;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const BROADCAST_OBJECT_PATH = new RegExp(
  `^[A-Za-z0-9_-]+/broadcasts/${UUID}\\.mp3$`,
  'i',
);
const SIGNING_ERROR = '广播音频暂时无法播放';

async function createBroadcastSignedUrlMap(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  paths: string[],
): Promise<Map<string, string>> {
  const uniquePaths = [...new Set(paths)];
  if (uniquePaths.some((path) => !BROADCAST_OBJECT_PATH.test(path))) {
    throw new ApiError(400, '广播音频对象路径非法');
  }

  const bucket = getVoiceBucketName();
  const { data: bucketData, error: bucketError } = await supabase.storage
    .getBucket(bucket);
  if (bucketError || !bucketData || bucketData.public !== false) {
    throw new ApiError(503, '私有语音存储不可用');
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(uniquePaths, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    throw new ApiError(503, '语音文件暂时无法播放');
  }

  const expectedPaths = new Set(uniquePaths);
  const signedUrlByPath = new Map<string, string>();
  for (const item of data) {
    const path = item.path;
    const signedUrl = item.signedUrl;
    if (
      item.error
      || typeof path !== 'string'
      || !expectedPaths.has(path)
      || signedUrlByPath.has(path)
      || typeof signedUrl !== 'string'
      || !signedUrl.trim()
    ) {
      throw new ApiError(503, '语音文件暂时无法播放');
    }
    signedUrlByPath.set(path, signedUrl);
  }

  if (signedUrlByPath.size !== expectedPaths.size) {
    throw new ApiError(503, '语音文件暂时无法播放');
  }
  return signedUrlByPath;
}

export async function GET(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const params = request.nextUrl.searchParams;
    const limitParam = params.get('limit');
    const limit = limitParam ? Number(limitParam) : 10;
    if (
      !Number.isFinite(limit) ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      throw new ApiError(400, 'limit 必须为 1–50 之间的整数');
    }

    const supabase = getSupabaseServerClient();

    // 获取用户信息（对齐 Python select("id,name,birth_date,chronic_diseases,role")）
    const { data: userData, error: userError } = await supabase
      .from('oc_users')
      .select('*')
      .eq('id', currentUserId);

    if (userError) {
      console.error('[GET /radio/recommend] 查询用户失败:', userError);
      throw new ApiError(500, '获取用户信息失败');
    }

    // 对齐 Python：user_info = user_rows[0] if user_rows else {}
    const userInfo = (userData ?? [])[0] as UsersRow | undefined;

    const filters = buildRecommendFilters({
      birth_date: userInfo?.birth_date ?? null,
      chronic_diseases: userInfo?.chronic_diseases ?? null,
    });

    // 查询已发布的广播
    let query = supabase
      .from('oc_health_broadcasts')
      .select('*')
      .eq('is_published', true);

    // 按季节过滤（包含当前季节或无季节限制的）
    // Supabase JS .or 语法：column.op.value,column2.op2.value2（对齐 Python or_）
    if (filters.season) {
      query = query.or(
        `target_season.eq.${filters.season},target_season.is.null`,
      );
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[GET /radio/recommend] 查询广播失败:', error);
      throw new ApiError(500, '获取推荐广播失败');
    }

    const rows = (data ?? []) as BroadcastRow[];
    const audioPaths = rows.flatMap((row) => (
      row.audio_url ? [row.audio_url] : []
    ));
    let signedUrlByPath = new Map<string, string>();
    if (audioPaths.length > 0) {
      try {
        signedUrlByPath = await createBroadcastSignedUrlMap(
          supabase,
          audioPaths,
        );
      } catch {
        // 数据库存的是内部对象路径；任一验证或签名失败都不能回退泄露路径。
        throw new ApiError(503, SIGNING_ERROR);
      }
    }

    const playableRows = rows.map((row) => {
      const response = toBroadcastResponse(row);
      if (!row.audio_url) return response;

      const signedUrl = signedUrlByPath.get(row.audio_url);
      if (!signedUrl) throw new ApiError(503, SIGNING_ERROR);
      return { ...response, audio_url: signedUrl };
    });
    return withPrivateNoStore(
      NextResponse.json<BroadcastResponse[]>(playableRows),
    );
  } catch (err) {
    return withPrivateNoStore(toApiResponse(err));
  }
}

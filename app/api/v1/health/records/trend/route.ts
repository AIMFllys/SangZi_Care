// ============================================================
// GET /api/v1/health/records/trend
// ------------------------------------------------------------
// 对齐 backend/api/v1/health.py · get_trend
// 获取指定类型在最近 N 天（1–90）内的健康记录，按 measured_at 升序（用于绘图）。
// 跨用户查询需 active 绑定且 can_view_health=true。
// 查询参数：record_type（必填）、days（默认 7，1–90）、user_id（可选）
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import {
  resolveHealthTarget,
  toRecordResponse,
  type HealthRecordResponse,
  type HealthRecordRow,
} from '../../_lib';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const params = request.nextUrl.searchParams;
    const recordType = params.get('record_type');
    if (!recordType || recordType.trim() === '') {
      throw new ApiError(400, 'record_type 不能为空');
    }

    const daysParam = params.get('days');
    const days = daysParam ? Number(daysParam) : 7;
    if (!Number.isFinite(days) || days < 1 || days > 90) {
      throw new ApiError(400, 'days 必须为 1–90 之间的整数');
    }

    const requestedUserId = params.get('user_id');

    const supabase = getSupabaseServerClient();
    const targetUserId = await resolveHealthTarget(
      supabase,
      currentUserId,
      requestedUserId,
    );

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('health_records')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('record_type', recordType)
      .gte('measured_at', since)
      .order('measured_at', { ascending: true });

    if (error) {
      console.error('[GET /health/records/trend] 查询失败:', error);
      throw new ApiError(500, '获取趋势数据失败');
    }

    const rows = (data ?? []) as HealthRecordRow[];
    return NextResponse.json<HealthRecordResponse[]>(rows.map(toRecordResponse));
  } catch (err) {
    return toApiResponse(err);
  }
}

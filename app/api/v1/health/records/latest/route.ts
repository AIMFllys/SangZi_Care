// ============================================================
// GET /api/v1/health/records/latest
// ------------------------------------------------------------
// 对齐 backend/api/v1/health.py · get_latest_records
// 获取每种类型的最新一条健康记录，返回 { [record_type]: record | null }。
// 跨用户查询需 active 绑定且 can_view_health=true。
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import { RECORD_TYPES } from '@/lib/server/health-thresholds';
import {
  resolveHealthTarget,
  toRecordResponse,
  type HealthRecordResponse,
  type HealthRecordRow,
} from '../../_lib';

export const runtime = 'nodejs';

type LatestRecordsResponse = Partial<Record<string, HealthRecordResponse | null>>;

export async function GET(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const requestedUserId = request.nextUrl.searchParams.get('user_id');

    const supabase = getSupabaseServerClient();
    const targetUserId = await resolveHealthTarget(
      supabase,
      currentUserId,
      requestedUserId,
    );

    const latest: LatestRecordsResponse = {};

    for (const rt of RECORD_TYPES) {
      const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('record_type', rt)
        .order('measured_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[GET /health/records/latest] 查询失败:', error);
        latest[rt] = null;
        continue;
      }

      const rows = (data ?? []) as HealthRecordRow[];
      latest[rt] = rows.length > 0 ? toRecordResponse(rows[0]) : null;
    }

    return NextResponse.json<LatestRecordsResponse>(latest);
  } catch (err) {
    return toApiResponse(err);
  }
}

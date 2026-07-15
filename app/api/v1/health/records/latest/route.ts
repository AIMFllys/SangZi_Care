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
  withPrivateNoStore,
} from '@/lib/server';
import {
  RECORD_TYPES,
  type HealthRecordType,
} from '@/lib/server/health-thresholds';
import {
  resolveHealthTarget,
  toRecordResponse,
  type HealthRecordResponse,
  type HealthRecordRow,
} from '../../_lib';

export const runtime = 'nodejs';

type LatestRecordsResponse = Record<HealthRecordType, HealthRecordResponse | null>;

const RECORD_TYPE_SET = new Set<string>(RECORD_TYPES);

function isHealthRecordType(value: string): value is HealthRecordType {
  return RECORD_TYPE_SET.has(value);
}

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

    const latest = Object.fromEntries(
      RECORD_TYPES.map((recordType) => [recordType, null]),
    ) as LatestRecordsResponse;

    const { data, error } = await supabase
      .from('oc_health_records')
      .select('*')
      .eq('user_id', targetUserId)
      .in('record_type', [...RECORD_TYPES])
      .order('measured_at', { ascending: false });

    if (error) {
      console.error('[GET /health/records/latest] 查询失败:', error);
    } else {
      for (const row of (data ?? []) as HealthRecordRow[]) {
        if (!isHealthRecordType(row.record_type) || latest[row.record_type] !== null) {
          continue;
        }
        latest[row.record_type] = toRecordResponse(row);
      }
    }

    return withPrivateNoStore(
      NextResponse.json<LatestRecordsResponse>(latest),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}

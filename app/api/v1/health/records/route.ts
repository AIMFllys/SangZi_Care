// ============================================================
// POST / GET /api/v1/health/records
// ------------------------------------------------------------
// 对齐 backend/api/v1/health.py · create_record / get_records
//   POST : 录入健康数据，自动判定异常并标记 is_abnormal/abnormal_reason
//          写入仅本人可写（plan 04 §3：body.user_id 必须等于当前用户）
//   GET  : 分页查询，按 measured_at 降序；可选 user_id / record_type
//          跨用户查询需 active 绑定且 can_view_health=true
// 返回：POST → HealthRecordResponse(201)；GET → HealthRecordResponse[]
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import { checkAbnormal } from '@/lib/server/health-thresholds';
import type { Json } from '@/types/supabase';
import {
  resolveHealthTarget,
  toRecordResponse,
  type HealthRecordInsert,
  type HealthRecordResponse,
  type HealthRecordRow,
} from '../_lib';

export const runtime = 'nodejs';

interface HealthRecordCreateBody {
  user_id?: unknown;
  record_type?: unknown;
  values?: unknown;
  measured_at?: unknown;
  input_method?: unknown;
  recorded_by?: unknown;
  notes?: unknown;
  symptoms?: unknown;
}

function parseOptionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, `${field} 必须为字符串`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// POST /api/v1/health/records — 录入健康数据
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const body = (await request.json().catch(() => null)) as HealthRecordCreateBody | null;
    if (!body) {
      throw new ApiError(400, '请求体必须为 JSON');
    }

    // record_type 必填
    if (typeof body.record_type !== 'string' || body.record_type.trim() === '') {
      throw new ApiError(400, 'record_type 不能为空');
    }
    const recordType = body.record_type;

    // values 必填且为对象
    if (
      body.values === null ||
      body.values === undefined ||
      typeof body.values !== 'object' ||
      Array.isArray(body.values)
    ) {
      throw new ApiError(400, 'values 必须为对象');
    }
    const values = body.values as Record<string, unknown>;

    // user_id：仅本人可写；缺省回填当前用户
    const targetUserId =
      typeof body.user_id === 'string' && body.user_id.trim() !== ''
        ? body.user_id
        : currentUserId;
    if (targetUserId !== currentUserId) {
      throw new ApiError(403, '仅本人可录入健康数据');
    }

    // measured_at：缺省/非法时回填当前时间（兼容语音录入未传时间的场景）
    const measuredAt =
      typeof body.measured_at === 'string' && body.measured_at.trim() !== ''
        ? body.measured_at
        : new Date().toISOString();

    const inputMethod = parseOptionalString(body.input_method, 'input_method');
    const recordedBy = parseOptionalString(body.recorded_by, 'recorded_by');
    const notes = parseOptionalString(body.notes, 'notes');
    const symptoms = parseOptionalString(body.symptoms, 'symptoms');

    // 异常判定
    const { is_abnormal, abnormal_reason } = checkAbnormal(recordType, values);

    const now = new Date().toISOString();
    const record: HealthRecordInsert = {
      user_id: targetUserId,
      record_type: recordType,
      values: values as Json,
      measured_at: measuredAt,
      is_abnormal,
      ...(abnormal_reason ? { abnormal_reason } : {}),
      ...(inputMethod !== null ? { input_method: inputMethod } : {}),
      ...(recordedBy !== null ? { recorded_by: recordedBy } : {}),
      ...(notes !== null ? { notes } : {}),
      ...(symptoms !== null ? { symptoms } : {}),
      created_at: now,
    };

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('health_records')
      .insert(record)
      .select('*');

    if (error) {
      console.error('[POST /health/records] 录入失败:', error);
      throw new ApiError(500, '录入健康数据失败');
    }
    if (!data || data.length === 0) {
      throw new ApiError(500, '录入健康数据失败');
    }

    return NextResponse.json<HealthRecordResponse>(
      toRecordResponse(data[0] as HealthRecordRow),
      { status: 201 },
    );
  } catch (err) {
    return toApiResponse(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/health/records — 分页查询
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const params = request.nextUrl.searchParams;
    const requestedUserId = params.get('user_id');
    const recordType = params.get('record_type');

    const limitParam = params.get('limit');
    const offsetParam = params.get('offset');
    const limit = limitParam ? Number(limitParam) : 20;
    const offset = offsetParam ? Number(offsetParam) : 0;
    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      throw new ApiError(400, 'limit 必须为 1–100 之间的整数');
    }
    if (!Number.isFinite(offset) || offset < 0) {
      throw new ApiError(400, 'offset 必须为非负整数');
    }

    const supabase = getSupabaseServerClient();
    const targetUserId = await resolveHealthTarget(
      supabase,
      currentUserId,
      requestedUserId,
    );

    let query = supabase
      .from('health_records')
      .select('*')
      .eq('user_id', targetUserId);

    if (recordType) {
      query = query.eq('record_type', recordType);
    }

    const { data, error } = await query
      .order('measured_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[GET /health/records] 查询失败:', error);
      throw new ApiError(500, '获取健康记录失败');
    }

    const rows = (data ?? []) as HealthRecordRow[];
    return NextResponse.json<HealthRecordResponse[]>(rows.map(toRecordResponse));
  } catch (err) {
    return toApiResponse(err);
  }
}

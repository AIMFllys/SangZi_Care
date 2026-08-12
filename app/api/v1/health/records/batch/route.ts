import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
  withPrivateNoStore,
} from '@/lib/server';
import { readBoundedJson } from '../../../_http';
import { checkAbnormal } from '@/lib/server/health-thresholds';
import type { Json } from '@/types/supabase';
import {
  resolveHealthTarget,
  toRecordResponse,
  type HealthRecordRow,
} from '../../_lib';

export const runtime = 'nodejs';

const MAX_RECORDS = 5;
const MAX_BODY_BYTES = 64 * 1024;
const RECORD_TYPES = new Set([
  'blood_pressure',
  'blood_sugar',
  'heart_rate',
  'weight',
  'temperature',
]);
const INPUT_METHODS = new Set(['manual', 'voice', 'family']);
const BODY_KEYS = new Set(['user_id', 'records']);
const RECORD_KEYS = new Set([
  'record_type', 'values', 'measured_at', 'input_method', 'notes', 'symptoms',
]);

interface BatchBody {
  user_id?: unknown;
  records?: unknown;
}

interface BatchRecordInput {
  record_type: string;
  values: Record<string, unknown>;
  measured_at: string;
  input_method: string | null;
  notes: string | null;
  symptoms: string | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function assertKnownKeys(value: Record<string, unknown>, allowed: Set<string>, field: string) {
  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown) throw new ApiError(400, `${field}.${unknown} 不是支持的字段`);
}

function parseOptionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, `${field} 必须为字符串`);
  }
  if (value.length > 2000) {
    throw new ApiError(400, `${field} 长度不能超过 2000 个字符`);
  }
  return value;
}

function parseValues(recordType: string, value: unknown): Record<string, unknown> {
  if (!isObject(value)) throw new ApiError(400, 'values 必须为对象');

  const readPositive = (key: string): number => {
    const candidate = value[key];
    if (typeof candidate !== 'number' || !Number.isFinite(candidate) || candidate <= 0) {
      throw new ApiError(400, `${recordType}.${key} 必须为正数`);
    }
    return candidate;
  };

  switch (recordType) {
    case 'blood_pressure':
      return { systolic: readPositive('systolic'), diastolic: readPositive('diastolic') };
    case 'blood_sugar': {
      const result: Record<string, unknown> = { value: readPositive('value') };
      const measurementType = value.measurement_type ?? value.timing;
      if (measurementType !== undefined) {
        if (measurementType !== 'fasting' && measurementType !== 'postprandial') {
          throw new ApiError(400, 'blood_sugar.measurement_type 无效');
        }
        result.measurement_type = measurementType;
      }
      return result;
    }
    case 'heart_rate':
    case 'weight':
    case 'temperature':
      return { value: readPositive('value') };
    default:
      throw new ApiError(400, '不支持的 record_type');
  }
}

function parseRecord(
  value: unknown,
  currentUserId: string,
  targetUserId: string,
): Omit<BatchRecordInput, 'values'> & { values: Json } {
  if (!isObject(value)) throw new ApiError(400, 'records 中的每一项必须为对象');
  assertKnownKeys(value, RECORD_KEYS, 'records');

  const recordType = value.record_type;
  if (typeof recordType !== 'string' || !RECORD_TYPES.has(recordType)) {
    throw new ApiError(400, 'record_type 无效');
  }

  const measuredAt = value.measured_at;
  if (measuredAt !== undefined && typeof measuredAt !== 'string') {
    throw new ApiError(400, 'measured_at 必须为字符串');
  }
  const normalizedMeasuredAt = typeof measuredAt === 'string' && measuredAt.trim()
    ? measuredAt
    : new Date().toISOString();
  if (!Number.isFinite(new Date(normalizedMeasuredAt).getTime())) {
    throw new ApiError(400, 'measured_at 无效');
  }

  const requestedInputMethod = value.input_method;
  if (requestedInputMethod !== undefined && requestedInputMethod !== null
    && (typeof requestedInputMethod !== 'string' || !INPUT_METHODS.has(requestedInputMethod))) {
    throw new ApiError(400, 'input_method 无效');
  }
  const inputMethod = targetUserId === currentUserId
    ? (requestedInputMethod === undefined ? 'manual' : requestedInputMethod as string | null)
    : 'family';

  return {
    record_type: recordType,
    values: parseValues(recordType, value.values) as Json,
    measured_at: normalizedMeasuredAt,
    input_method: inputMethod,
    notes: parseOptionalString(value.notes, 'notes'),
    symptoms: parseOptionalString(value.symptoms, 'symptoms'),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await readBoundedJson<BatchBody | null>(request, MAX_BODY_BYTES);
    const { user_id: currentUserId } = await requireUser(request);
    if (!body || !isObject(body)) throw new ApiError(400, '请求体必须为 JSON 对象');
    assertKnownKeys(body, BODY_KEYS, '请求体');

    const targetUserId = typeof body.user_id === 'string' && body.user_id.trim()
      ? body.user_id
      : currentUserId;
    if (!Array.isArray(body.records) || body.records.length === 0) {
      throw new ApiError(400, 'records 必须为非空数组');
    }
    if (body.records.length > MAX_RECORDS) {
      throw new ApiError(400, `records 最多 ${MAX_RECORDS} 条`);
    }

    const supabase = getSupabaseServerClient();
    await resolveHealthTarget(supabase, currentUserId, targetUserId, 'edit');

    const records = body.records.map((record) => {
      const parsed = parseRecord(record, currentUserId, targetUserId);
      const abnormal = checkAbnormal(parsed.record_type, parsed.values as Record<string, unknown>);
      return {
        ...parsed,
        is_abnormal: abnormal.is_abnormal,
        ...(abnormal.abnormal_reason ? { abnormal_reason: abnormal.abnormal_reason } : {}),
      };
    });

    const { data, error } = await supabase.rpc('oc_create_health_records_batch', {
      p_target_user_id: targetUserId,
      p_recorded_by: currentUserId,
      p_records: records,
    });
    if (error) {
      console.error('[POST /health/records/batch] 批量写入失败:', error);
      throw new ApiError(500, '批量保存健康数据失败');
    }
    if (!Array.isArray(data)) {
      throw new ApiError(500, '批量保存返回格式无效');
    }

    return withPrivateNoStore(NextResponse.json({
      records: (data as HealthRecordRow[]).map(toRecordResponse),
      count: data.length,
    }, { status: 201 }));
  } catch (err) {
    return toApiResponse(err);
  }
}

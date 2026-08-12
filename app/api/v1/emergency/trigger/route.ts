import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
  withPrivateNoStore,
} from '@/lib/server';
import type { Json } from '@/types/supabase';
import { parseTriggerRpcResult, type EmergencyTriggerResponse } from '../_lib';
import { readBoundedJson } from '../../_http';

export const runtime = 'nodejs';

interface TriggerBody {
  request_id?: unknown;
  trigger_method?: unknown;
  location?: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_JSON_BYTES = 2 * 1024;

function parseLocation(value: unknown): Json | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError(400, 'location 必须为坐标对象');
  }
  const location = value as Record<string, unknown>;
  const keys = Object.keys(location);
  if (keys.some((key) => !['latitude', 'longitude', 'accuracy'].includes(key))) {
    throw new ApiError(400, 'location 只能包含 latitude、longitude 和 accuracy');
  }
  const latitude = location.latitude;
  const longitude = location.longitude;
  const accuracy = location.accuracy;
  if (
    typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    || (accuracy !== undefined && (
      typeof accuracy !== 'number' || !Number.isFinite(accuracy) || accuracy < 0
    ))
  ) {
    throw new ApiError(400, 'location 坐标格式非法');
  }
  return accuracy === undefined ? { latitude, longitude } : { latitude, longitude, accuracy };
}

export async function POST(request: NextRequest) {
  try {
    const { user_id: elderId } = await requireUser(request);

    const body = await readBoundedJson<TriggerBody | null>(request, MAX_JSON_BYTES);
    if (!body) throw new ApiError(400, '请求体必须为 JSON');
    if (typeof body.request_id !== 'string' || !UUID_RE.test(body.request_id)) {
      throw new ApiError(400, 'request_id 必须为 UUID');
    }
    if (body.trigger_method !== 'button' && body.trigger_method !== 'voice') {
      throw new ApiError(400, 'trigger_method 只允许 button 或 voice');
    }
    const location = parseLocation(body.location);
    const { data, error } = await getSupabaseServerClient().rpc('oc_trigger_emergency', {
      p_elder_id: elderId,
      p_request_id: body.request_id,
      p_trigger_method: body.trigger_method,
      p_location: location,
    });
    if (error || data === null) {
      console.error('[POST /emergency/trigger] RPC failed', { code: error?.code ?? 'empty_result' });
      if (error?.code === 'P0001' && error.message === 'emergency_request_conflict') {
        throw new ApiError(409, '同一请求编号的紧急求助内容不一致，请重新发起');
      }
      if (error?.code === 'P0001' && error.message === 'invalid_emergency_actor') {
        throw new ApiError(403, '仅长辈账号可触发紧急求助');
      }
      throw new ApiError(500, '紧急求助暂时无法发送，请重试并立即拨打 120');
    }

    let response: EmergencyTriggerResponse;
    try {
      response = parseTriggerRpcResult(data, {
        elderId,
        requestId: body.request_id,
        triggerMethod: body.trigger_method,
        location,
      });
    } catch {
      console.error('[POST /emergency/trigger] RPC returned an invalid result');
      throw new ApiError(500, '紧急求助暂时无法发送，请重试并立即拨打 120');
    }
    return withPrivateNoStore(NextResponse.json<EmergencyTriggerResponse>(response));
  } catch (error) {
    return toApiResponse(error);
  }
}

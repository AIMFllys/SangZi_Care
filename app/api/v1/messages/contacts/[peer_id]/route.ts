import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
  withPrivateNoStore,
} from '@/lib/server';
import { readBoundedJson } from '../../../_http';
import { resolveMessagePeer } from '../../_lib';

export const runtime = 'nodejs';

const MAX_JSON_BYTES = 2 * 1024;
const ALLOWED_KEYS = new Set(['alias', 'is_pinned']);

interface PreferenceBody {
  alias?: unknown;
  is_pinned?: unknown;
}

interface PreferenceResponse {
  alias: string | null;
  is_pinned: boolean;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ peer_id: string }> },
) {
  try {
    const { user_id: ownerId } = await requireUser(request);
    const { peer_id: peerId } = await params;
    const body = await readBoundedJson<PreferenceBody | null>(request, MAX_JSON_BYTES);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new ApiError(400, '请求体必须为 JSON 对象');
    }
    const keys = Object.keys(body);
    if (
      keys.length !== 2
      || keys.some((key) => !ALLOWED_KEYS.has(key))
      || !Object.hasOwn(body, 'alias')
      || !Object.hasOwn(body, 'is_pinned')
    ) {
      throw new ApiError(400, '必须且只能提供 alias 和 is_pinned');
    }
    if (body.alias !== null && typeof body.alias !== 'string') {
      throw new ApiError(400, 'alias 必须为字符串或 null');
    }
    if (typeof body.is_pinned !== 'boolean') {
      throw new ApiError(400, 'is_pinned 必须为布尔值');
    }
    const alias = typeof body.alias === 'string' ? body.alias.trim() || null : null;
    if (alias && Array.from(alias).length > 40) {
      throw new ApiError(400, '备注不能超过 40 个字符');
    }
    if (peerId === ownerId) throw new ApiError(400, '不能把本人设为联系人');

    const supabase = getSupabaseServerClient();
    await resolveMessagePeer(supabase, ownerId, peerId);
    const updatedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('oc_contact_preferences')
      .upsert({
        owner_id: ownerId,
        peer_id: peerId,
        alias,
        is_pinned: body.is_pinned,
        updated_at: updatedAt,
      }, {
        onConflict: 'owner_id,peer_id',
      })
      .select('alias, is_pinned');
    if (error || !data || data.length !== 1) {
      console.error('[PUT /messages/contacts/:peer] preference write failed', {
        code: error?.code ?? 'invalid_result',
      });
      throw new ApiError(500, '保存联系人设置失败');
    }
    const row = data[0];
    if ((row.alias !== null && typeof row.alias !== 'string') || typeof row.is_pinned !== 'boolean') {
      throw new ApiError(500, '联系人设置响应无效');
    }
    return withPrivateNoStore(NextResponse.json<PreferenceResponse>({
      alias: row.alias,
      is_pinned: row.is_pinned,
    }));
  } catch (error) {
    return withPrivateNoStore(toApiResponse(error));
  }
}

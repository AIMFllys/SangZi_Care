// ============================================================
// GET /api/v1/messages/{user_id}
// ------------------------------------------------------------
// 对齐 backend/api/v1/messages.py · get_messages
//   - 获取当前用户与指定用户之间的消息（按时间正序）
//   - query: limit(default 50, 1-200), offset(default 0, >=0)
//   - 跨用户校验：与 user_id 需存在 active 家庭绑定（plan 06 增强）
// 返回：MessageResponse[]
// 注意：[id] 同时承载 user_id（会话）与 message_id（已读子路由），
//   read 段在子路径 [id]/read，不与本路由冲突；前端契约不变。
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
  withPrivateNoStore,
} from '@/lib/server';
import {
  resolveMessagePeer,
  toPlayableMessageResponse,
  type MessageResponse,
  type MessageRow,
} from '../_lib';

export const runtime = 'nodejs';

function parseLimit(raw: string | null): number {
  if (raw === null) return 50;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 200) {
    throw new ApiError(400, 'limit 必须为 1-200 的整数');
  }
  return n;
}

function parseOffset(raw: string | null): number {
  if (raw === null) return 0;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) {
    throw new ApiError(400, 'offset 必须为 >=0 的整数');
  }
  return n;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user_id: currentUserId } = await requireUser(request);
    const { id: peerId } = await params;

    if (!peerId) {
      throw new ApiError(400, 'user_id 不能为空');
    }

    const sp = request.nextUrl.searchParams;
    const limit = parseLimit(sp.get('limit'));
    const offset = parseOffset(sp.get('offset'));

    const supabase = getSupabaseServerClient();
    await resolveMessagePeer(supabase, currentUserId, peerId);

    const { data, error } = await supabase
      .from('oc_elder_care_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${currentUserId})`,
      )
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[GET /messages/:id] 查询失败');
      throw new ApiError(500, '获取消息列表失败');
    }

    const rows = (data ?? []) as MessageRow[];
    return withPrivateNoStore(
      NextResponse.json<MessageResponse[]>(
        rows.map(toPlayableMessageResponse),
      ),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}

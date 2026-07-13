// ============================================================
// POST /api/v1/radio/play-record
// ------------------------------------------------------------
// 对齐 backend/api/v1/radio.py · create_play_record
//   1. requireUser 鉴权
//   2. 写 broadcast_play_history（user_id 取自 token）
//   3. best-effort 更新 health_broadcasts.play_count += 1
//      （JS SDK 无原生 "play_count + 1" 语法，用先读后写；
//       失败仅 console.error，不抛错，对齐 Python except: pass）
// 返回：201 PlayRecordResponse（插入的行）
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
  withPrivateNoStore,
} from '@/lib/server';
import { toPlayRecordResponse } from '../_lib';
import type {
  PlayHistoryInsert,
  PlayHistoryRow,
  PlayRecordRequest,
  PlayRecordResponse,
} from '../_lib';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const body = (await request
      .json()
      .catch(() => null)) as PlayRecordRequest | null;
    if (
      !body ||
      typeof body.broadcast_id !== 'string' ||
      body.broadcast_id.trim() === ''
    ) {
      throw new ApiError(400, 'broadcast_id 不能为空');
    }

    const now = new Date().toISOString();
    const record: PlayHistoryInsert = {
      user_id: currentUserId,
      broadcast_id: body.broadcast_id,
      played_at: now,
      play_duration: body.play_duration ?? null,
      completed: body.completed ?? null,
      liked: body.liked ?? null,
      created_at: now,
    };

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('oc_broadcast_play_history')
      .insert(record)
      .select();

    if (error) {
      console.error('[POST /radio/play-record] 写入播放历史失败:', error);
      throw new ApiError(500, '记录播放历史失败');
    }

    const rows = (data ?? []) as PlayHistoryRow[];
    if (rows.length === 0) {
      throw new ApiError(500, '记录播放历史失败');
    }

    // best-effort 更新广播播放次数（对齐 Python except: pass）
    // JS SDK 无 "play_count + 1" 原生语法，采用先读后写。
    try {
      const { data: broadcast } = await supabase
        .from('oc_health_broadcasts')
        .select('play_count')
        .eq('id', body.broadcast_id)
        .maybeSingle();
      if (broadcast) {
        const current = broadcast.play_count ?? 0;
        await supabase
          .from('oc_health_broadcasts')
          .update({ play_count: current + 1 })
          .eq('id', body.broadcast_id);
      }
    } catch (err) {
      console.error(
        '[POST /radio/play-record] 更新播放次数失败（忽略）:',
        err,
      );
    }

    return withPrivateNoStore(
      NextResponse.json<PlayRecordResponse>(
        toPlayRecordResponse(rows[0]),
        { status: 201 },
      ),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}

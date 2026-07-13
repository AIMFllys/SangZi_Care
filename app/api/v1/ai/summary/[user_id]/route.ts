// ============================================================
// GET /api/v1/ai/summary/{user_id}
// ------------------------------------------------------------
// 对齐 backend/api/v1/ai_chat.py · ai_summary
//   1. requireUser 鉴权
//   2. 查询 ai_conversations 最近 50 条（按 created_at desc）
//   3. 无记录返回 { summary: "暂无对话记录", message_count: 0 }
//   4. 组装对话列表（逆序成时间正序）调用豆包 generateSummary
// 返回：{ summary, message_count }
//
// 注：Python 仅 require_auth，未做跨用户绑定校验；plan 07 文档
//   "跨用户需绑定校验"为后续改进项，本版对齐 Python 行为。
//   前端 useAIChat.getSummary / summaryStore.fetchSummary 仅传当前用户 id。
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import { generateSummary, type LlmMessage } from '@/lib/server/doubao';
import type {
  AiConversationSummaryRow,
  SummaryResponse,
} from '../../_lib';
import { withPrivateNoStore } from '../../../_http';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ user_id: string }> },
) {
  try {
    await requireUser(request);
    const { user_id } = await params;

    if (!user_id) {
      throw new ApiError(400, 'user_id 不能为空');
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('oc_ai_conversations')
      .select('user_input, ai_response')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[GET /ai/summary] 查询对话记录失败:', error);
      throw new ApiError(500, '获取对话摘要失败');
    }

    const rows = (data ?? []) as AiConversationSummaryRow[];
    const messageCount = rows.length;

    if (messageCount === 0) {
      return withPrivateNoStore(NextResponse.json<SummaryResponse>({
        summary: '暂无对话记录',
        message_count: 0,
      }));
    }

    // 逆序成时间正序，组装 user/assistant 交替（对齐 Python reversed(rows)）
    const conversations: LlmMessage[] = [];
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      conversations.push({ role: 'user', content: row.user_input ?? '' });
      conversations.push({
        role: 'assistant',
        content: row.ai_response ?? '',
      });
    }

    const summary = await generateSummary(conversations);

    return withPrivateNoStore(NextResponse.json<SummaryResponse>({
      summary,
      message_count: messageCount,
    }));
  } catch (err) {
    return withPrivateNoStore(toApiResponse(err));
  }
}

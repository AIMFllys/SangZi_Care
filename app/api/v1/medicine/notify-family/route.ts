// ============================================================
// POST /api/v1/medicine/notify-family
// ------------------------------------------------------------
// 对齐 backend/api/v1/medicine.py · notify_family
//   - 查 elder_id = body.user_id 的 active 绑定，筛选可接收紧急通知的
//     家属，返回 family_id 列表（不实际推送，对齐 Python stub 行为）
//   - 表结构修正：elder_family_binds 使用 can_receive_emergency 布尔列，
//     不是 Python 代码里假设的 permissions.receive_emergency_notifications
//     JSON 字段（types/supabase.ts 为准）
//   - plan 05 §2：可保持 stub
// 返回：NotifyFamilyResponse
// ============================================================

import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
} from '@/lib/server';
import type { NotifyFamilyResponse } from '../_lib';

export const runtime = 'nodejs';

interface NotifyFamilyBody {
  user_id?: unknown;
  plan_id?: unknown;
  scheduled_time?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(request);

    const body =
      (await request.json().catch(() => null)) as NotifyFamilyBody | null;
    if (!body) {
      throw new ApiError(400, '请求体必须为 JSON');
    }

    if (typeof body.user_id !== 'string' || body.user_id.trim() === '') {
      throw new ApiError(400, 'user_id 不能为空');
    }
    if (typeof body.plan_id !== 'string' || body.plan_id.trim() === '') {
      throw new ApiError(400, 'plan_id 不能为空');
    }
    if (
      typeof body.scheduled_time !== 'string' ||
      body.scheduled_time.trim() === ''
    ) {
      throw new ApiError(400, 'scheduled_time 不能为空');
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('elder_family_binds')
      .select('family_id')
      .eq('elder_id', body.user_id)
      .eq('status', 'active')
      .eq('can_receive_emergency', true);

    if (error) {
      console.error('[POST /medicine/notify-family] 查询绑定失败:', error);
      throw new ApiError(500, '通知家属失败');
    }

    const rows = (data ?? []) as Array<{ family_id: string | null }>;
    const notifiedFamilyIds = rows
      .map((r) => r.family_id)
      .filter((id): id is string => typeof id === 'string' && id !== '');

    const response: NotifyFamilyResponse =
      notifiedFamilyIds.length === 0
        ? {
            message: '没有可通知的家属',
            notified_count: 0,
            notified_family_ids: [],
          }
        : {
            message: '已通知家属',
            notified_count: notifiedFamilyIds.length,
            notified_family_ids: notifiedFamilyIds,
          };

    return NextResponse.json<NotifyFamilyResponse>(response);
  } catch (err) {
    return toApiResponse(err);
  }
}

// ============================================================
// GET /api/v1/medicine/today
// ------------------------------------------------------------
// 对齐 backend/api/v1/medicine.py · get_today_timeline
//   - 取目标用户当日适用的活跃 plans，按 schedule_times 展开为
//     timeline items，关联当日 medication_records 计算 status
//   - 跨用户查询需 active 绑定且 can_view_health=true
//   - 今日适用判定：start_date <= today <= end_date（如有），
//     且 repeat_days 为空或包含今日 isoweekday（1=Mon..7=Sun）
//   - 按 scheduled_time 升序排序
// 返回：TodayTimelineResponse { date, items[] }
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
  resolveMedicationTarget,
  toPlanResponse,
  toRecordResponse,
  type MedicationPlanRow,
  type MedicationRecordRow,
  type MedicationStatus,
  type TodayTimelineItem,
  type TodayTimelineResponse,
} from '../_lib';
import {
  createScheduledAt,
  getCareDateInfo,
  getCareDayRange,
  normalizePlanTime,
} from '../_time';

export const runtime = 'nodejs';

const VALID_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'taken',
  'skipped',
  'delayed',
]);

export async function GET(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);

    const requestedUserId = request.nextUrl.searchParams.get('user_id');

    const supabase = getSupabaseServerClient();
    const targetUserId = await resolveMedicationTarget(
      supabase,
      currentUserId,
      requestedUserId,
      'view',
    );

    const today = getCareDateInfo();
    const { start, endExclusive } = getCareDayRange(today.date);

    // 计划与已发生记录互不依赖，并行读取以缩短首屏等待。
    const [plansResult, recordsResult] = await Promise.all([
      supabase
        .from('oc_medication_plans')
        .select('*')
        .eq('user_id', targetUserId)
        .eq('is_active', true),
      supabase
        .from('oc_medication_records')
        .select('*')
        .eq('user_id', targetUserId)
        .gte('scheduled_time', start)
        .lt('scheduled_time', endExclusive),
    ]);

    if (plansResult.error) {
      console.error('[GET /medicine/today] 查询 plans 失败:', plansResult.error);
      throw new ApiError(500, '获取今日用药失败');
    }

    const plans = (plansResult.data ?? []) as MedicationPlanRow[];

    // 2. 过滤今日适用的 plans
    const todayPlans: MedicationPlanRow[] = [];
    for (const plan of plans) {
      if (plan.start_date && plan.start_date > today.date) continue;
      if (plan.end_date && plan.end_date < today.date) continue;
      if (plan.repeat_days && !plan.repeat_days.includes(today.weekday)) {
        continue;
      }
      todayPlans.push(plan);
    }

    if (recordsResult.error) {
      console.error(
        '[GET /medicine/today] 查询 records 失败:',
        recordsResult.error,
      );
      throw new ApiError(500, '获取今日用药失败');
    }

    const records = (recordsResult.data ?? []) as MedicationRecordRow[];

    // 4. 建立 (plan_id, scheduled_time) -> record 查找表
    const recordLookup = new Map<string, MedicationRecordRow>();
    for (const rec of records) {
      recordLookup.set(
        `${rec.plan_id}|${new Date(rec.scheduled_time).toISOString()}`,
        rec,
      );
    }

    // 5. 组装 timeline items
    const items: TodayTimelineItem[] = [];
    for (const plan of todayPlans) {
      const times = plan.schedule_times ?? [];
      for (const stime of times) {
        const scheduledAt = createScheduledAt(today.date, stime);
        const rec = recordLookup.get(`${plan.id}|${scheduledAt}`);
        const rawStatus = rec?.status ?? 'pending';
        const status: MedicationStatus = VALID_STATUSES.has(rawStatus)
          ? (rawStatus as MedicationStatus)
          : 'pending';
        items.push({
          plan: toPlanResponse(plan),
          scheduled_time: normalizePlanTime(stime),
          scheduled_at: scheduledAt,
          record: rec ? toRecordResponse(rec) : null,
          status,
        });
      }
    }

    // 6. 按 scheduled_time 升序
    items.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));

    return withPrivateNoStore(
      NextResponse.json<TodayTimelineResponse>({
        date: today.date,
        items,
      }),
    );
  } catch (err) {
    return toApiResponse(err);
  }
}

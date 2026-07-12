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

export const runtime = 'nodejs';

const VALID_STATUSES: ReadonlySet<string> = new Set([
  'pending',
  'taken',
  'skipped',
  'delayed',
]);

/** 计算今日（服务器本地时区）的 YYYY-MM-DD 与 isoweekday(1=Mon..7=Sun)。 */
function getTodayInfo(): { todayStr: string; todayWeekday: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  // JS getDay: 0=Sun..6=Sat；ISO weekday: 1=Mon..7=Sun
  const jsDay = now.getDay();
  const todayWeekday = jsDay === 0 ? 7 : jsDay;
  return { todayStr, todayWeekday };
}

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

    const { todayStr, todayWeekday } = getTodayInfo();

    // 1. 拉取目标用户的活跃 plans
    const plansResult = await supabase
      .from('medication_plans')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_active', true);

    if (plansResult.error) {
      console.error('[GET /medicine/today] 查询 plans 失败:', plansResult.error);
      throw new ApiError(500, '获取今日用药失败');
    }

    const plans = (plansResult.data ?? []) as MedicationPlanRow[];

    // 2. 过滤今日适用的 plans
    const todayPlans: MedicationPlanRow[] = [];
    for (const plan of plans) {
      if (plan.start_date && plan.start_date > todayStr) continue;
      if (plan.end_date && plan.end_date < todayStr) continue;
      if (plan.repeat_days && !plan.repeat_days.includes(todayWeekday)) {
        continue;
      }
      todayPlans.push(plan);
    }

    // 3. 拉取当日 medication_records
    const recordsResult = await supabase
      .from('medication_records')
      .select('*')
      .eq('user_id', targetUserId)
      .gte('created_at', `${todayStr}T00:00:00`)
      .lte('created_at', `${todayStr}T23:59:59`);

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
      recordLookup.set(`${rec.plan_id}|${rec.scheduled_time}`, rec);
    }

    // 5. 组装 timeline items
    const items: TodayTimelineItem[] = [];
    for (const plan of todayPlans) {
      const times = plan.schedule_times ?? [];
      for (const stime of times) {
        const rec = recordLookup.get(`${plan.id}|${stime}`);
        const rawStatus = rec?.status ?? 'pending';
        const status: MedicationStatus = VALID_STATUSES.has(rawStatus)
          ? (rawStatus as MedicationStatus)
          : 'pending';
        items.push({
          plan: toPlanResponse(plan),
          scheduled_time: stime,
          record: rec ? toRecordResponse(rec) : null,
          status,
        });
      }
    }

    // 6. 按 scheduled_time 升序
    items.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time));

    return NextResponse.json<TodayTimelineResponse>({
      date: todayStr,
      items,
    });
  } catch (err) {
    return toApiResponse(err);
  }
}

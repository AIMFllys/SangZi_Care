import { NextResponse, type NextRequest } from 'next/server';
import {
  ApiError,
  getSupabaseServerClient,
  requireUser,
  toApiResponse,
  withPrivateNoStore,
} from '@/lib/server';
import {
  addCareDays,
  getCareDateInfo,
  getCareDayRange,
} from '@/app/api/v1/medicine/_time';
import type {
  CareDashboardResponse,
  CareVitalRecord,
  HealthTrendPoint,
  MedicationAdherencePoint,
} from '@/types/careDashboard';
import type { HealthRecordType, HealthValues } from '@/types/health';

export const runtime = 'nodejs';

const HEALTH_TYPES = new Set<HealthRecordType>([
  'blood_pressure',
  'blood_sugar',
  'heart_rate',
  'weight',
  'temperature',
]);

interface SnapshotMedicationDay {
  date: string;
  planned: number;
  completed: number;
}

interface SnapshotVital {
  id: string;
  record_type: string;
  values: HealthValues;
  measured_at: string;
  is_abnormal: boolean | null;
  abnormal_reason: string | null;
}

interface SnapshotHeartRateDay {
  date: string;
  value: unknown;
}

interface DashboardSnapshot {
  medication_adherence?: SnapshotMedicationDay[];
  latest_vitals?: SnapshotVital[];
  heart_rate_daily?: SnapshotHeartRateDay[];
  abnormal_count?: number;
}

function rate(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function toVital(row: SnapshotVital): CareVitalRecord | null {
  if (!HEALTH_TYPES.has(row.record_type as HealthRecordType)) return null;
  return {
    id: row.id,
    record_type: row.record_type as HealthRecordType,
    values: row.values ?? {},
    measured_at: row.measured_at,
    is_abnormal: row.is_abnormal,
    abnormal_reason: row.abnormal_reason,
  } as CareVitalRecord;
}

export async function GET(request: NextRequest) {
  try {
    const { user_id: currentUserId } = await requireUser(request);
    const requestedUserId = request.nextUrl.searchParams.get('user_id');
    if (!requestedUserId) {
      throw new ApiError(400, 'user_id 不能为空');
    }

    const supabase = getSupabaseServerClient();
    let canViewHealth = requestedUserId === currentUserId;
    let canViewMedication = requestedUserId === currentUserId;

    if (requestedUserId !== currentUserId) {
      const { data: bindRows, error: bindError } = await supabase
        .from('oc_elder_family_binds')
        .select('can_view_health, can_edit_health, can_edit_medication')
        .eq('family_id', currentUserId)
        .eq('elder_id', requestedUserId)
        .eq('status', 'active')
        .limit(1);

      if (bindError) {
        console.error('[GET /family/dashboard] 校验家庭绑定失败:', bindError);
        throw new ApiError(500, '校验家庭绑定失败');
      }
      const bind = bindRows?.[0];
      if (!bind) throw new ApiError(403, '无权查看该长辈的照护看板');

      canViewHealth = Boolean(bind.can_view_health || bind.can_edit_health);
      // 当前模型没有独立的用药只读开关；健康查看或用药管理任一授权即可查看用药摘要。
      canViewMedication = Boolean(
        bind.can_view_health || bind.can_edit_medication,
      );
      if (!canViewHealth && !canViewMedication) {
        throw new ApiError(403, '长辈尚未授权查看照护数据');
      }
    }

    const today = getCareDateInfo();
    const firstDate = addCareDays(today.date, -6);
    const dateRange = Array.from({ length: 7 }, (_, index) =>
      addCareDays(firstDate, index));
    const { start } = getCareDayRange(firstDate);
    const { endExclusive } = getCareDayRange(today.date);

    const { data, error } = await supabase.rpc(
      'oc_get_care_dashboard_snapshot',
      {
        p_user_id: requestedUserId,
        p_start: start,
        p_end: endExclusive,
        p_include_health: canViewHealth,
        p_include_medication: canViewMedication,
      },
    );
    if (error) {
      console.error('[GET /family/dashboard] 聚合查询失败:', error);
      throw new ApiError(500, '加载照护看板失败');
    }

    const snapshot = (data ?? {}) as DashboardSnapshot;
    const adherenceByDate = new Map(
      (snapshot.medication_adherence ?? []).map((point) => [point.date, point]),
    );
    const medicationAdherence: MedicationAdherencePoint[] = dateRange.map((date) => {
      const point = adherenceByDate.get(date);
      const planned = Number(point?.planned ?? 0);
      const completed = Number(point?.completed ?? 0);
      return {
        date,
        planned,
        completed,
        rate: rate(completed, planned),
      };
    });

    const todayMedication = medicationAdherence.at(-1) ?? {
      date: today.date,
      planned: 0,
      completed: 0,
      rate: 0,
    };
    const planned7d = medicationAdherence.reduce(
      (total, point) => total + point.planned,
      0,
    );
    const completed7d = medicationAdherence.reduce(
      (total, point) => total + point.completed,
      0,
    );

    const latestVitals: CareDashboardResponse['latestVitals'] = {};
    for (const row of snapshot.latest_vitals ?? []) {
      const vital = toVital(row);
      if (vital) latestVitals[vital.record_type] = vital;
    }

    const heartRateByDate = new Map<string, number>();
    for (const point of snapshot.heart_rate_daily ?? []) {
      const value = Number(point.value);
      if (Number.isFinite(value)) heartRateByDate.set(point.date, value);
    }
    const heartRateTrend: HealthTrendPoint[] = dateRange.map((date) => ({
      date,
      value: heartRateByDate.get(date) ?? null,
    }));

    return withPrivateNoStore(
      NextResponse.json<CareDashboardResponse>({
        target_user_id: requestedUserId,
        date: today.date,
        access: {
          health: canViewHealth,
          medication: canViewMedication,
        },
        todayMedication: {
          completed: todayMedication.completed,
          total: todayMedication.planned,
          rate: todayMedication.rate,
        },
        medicationAdherence,
        adherence7d: rate(completed7d, planned7d),
        latestVitals,
        heartRateTrend,
        abnormalCount7d: Number(snapshot.abnormal_count ?? 0),
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    return toApiResponse(error);
  }
}

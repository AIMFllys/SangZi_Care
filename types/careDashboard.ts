import type { HealthRecordType, HealthValues } from '@/types/health';

export interface CareVitalRecord {
  id: string;
  record_type: HealthRecordType;
  values: HealthValues;
  measured_at: string;
  is_abnormal: boolean | null;
  abnormal_reason: string | null;
}

export interface MedicationAdherencePoint {
  date: string;
  planned: number;
  completed: number;
  rate: number;
}

export interface HealthTrendPoint {
  date: string;
  value: number | null;
}

export interface CareDashboardResponse {
  target_user_id: string;
  date: string;
  access: {
    health: boolean;
    medication: boolean;
  };
  todayMedication: {
    completed: number;
    total: number;
    rate: number;
  };
  medicationAdherence: MedicationAdherencePoint[];
  adherence7d: number;
  latestVitals: Partial<Record<HealthRecordType, CareVitalRecord | null>>;
  heartRateTrend: HealthTrendPoint[];
  abnormalCount7d: number;
  updatedAt: string;
}

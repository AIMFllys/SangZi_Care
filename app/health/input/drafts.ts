import type { HealthRecordType } from '@/types/health';

export type { HealthRecordType } from '@/types/health';

export type InputMethod = 'manual' | 'voice';
export type VoiceInputStage =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'review'
  | 'confirmed'
  | 'error';
export type SugarMeasurementType = 'fasting' | 'postprandial';

export interface HealthFormValues {
  systolic: string;
  diastolic: string;
  bloodSugarValue: string;
  sugarType: SugarMeasurementType;
  heartRateValue: string;
  weightValue: string;
  temperatureValue: string;
  notes: string;
  symptoms: string;
}

export interface HealthDraft {
  values: HealthFormValues;
  inputMethod: InputMethod;
  voiceStage: VoiceInputStage;
  voiceTranscript: string;
  voiceError: string | null;
}

export const HEALTH_RECORD_TYPES: HealthRecordType[] = [
  'blood_pressure',
  'blood_sugar',
  'heart_rate',
  'weight',
  'temperature',
];

export const INITIAL_HEALTH_FORM_VALUES: HealthFormValues = {
  systolic: '',
  diastolic: '',
  bloodSugarValue: '',
  sugarType: 'fasting',
  heartRateValue: '',
  weightValue: '',
  temperatureValue: '',
  notes: '',
  symptoms: '',
};

function createInitialDraft(): HealthDraft {
  return {
    values: { ...INITIAL_HEALTH_FORM_VALUES },
    inputMethod: 'manual',
    voiceStage: 'idle',
    voiceTranscript: '',
    voiceError: null,
  };
}

export function createInitialHealthDrafts(): Record<HealthRecordType, HealthDraft> {
  return HEALTH_RECORD_TYPES.reduce(
    (drafts, recordType) => {
      drafts[recordType] = createInitialDraft();
      return drafts;
    },
    {} as Record<HealthRecordType, HealthDraft>,
  );
}

function hasMeasurementValue(recordType: HealthRecordType, values: HealthFormValues): boolean {
  switch (recordType) {
    case 'blood_pressure':
      return Boolean(values.systolic.trim() || values.diastolic.trim());
    case 'blood_sugar':
      return Boolean(values.bloodSugarValue.trim());
    case 'heart_rate':
      return Boolean(values.heartRateValue.trim());
    case 'weight':
      return Boolean(values.weightValue.trim());
    case 'temperature':
      return Boolean(values.temperatureValue.trim());
  }
}

export function hasHealthDraftInput(
  recordType: HealthRecordType,
  draft: HealthDraft,
): boolean {
  return Boolean(
    hasMeasurementValue(recordType, draft.values)
    || draft.values.notes.trim()
    || draft.values.symptoms.trim()
    || draft.voiceTranscript.trim()
    || draft.voiceStage !== 'idle',
  );
}

export function getDirtyHealthRecordTypes(
  drafts: Record<HealthRecordType, HealthDraft>,
): HealthRecordType[] {
  return HEALTH_RECORD_TYPES.filter((recordType) =>
    hasHealthDraftInput(recordType, drafts[recordType]),
  );
}

export function getHealthSubmissionTypes(
  drafts: Record<HealthRecordType, HealthDraft>,
): HealthRecordType[] {
  return getDirtyHealthRecordTypes(drafts).filter((recordType) =>
    hasMeasurementValue(recordType, drafts[recordType].values),
  );
}

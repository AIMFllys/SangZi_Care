import { describe, expect, it } from 'vitest';
import {
  createInitialHealthDrafts,
  getDirtyHealthRecordTypes,
  getHealthSubmissionTypes,
  type HealthDraft,
  type HealthRecordType,
} from '../drafts';

const blank = (): HealthDraft => ({
  values: {
    systolic: '',
    diastolic: '',
    bloodSugarValue: '',
    sugarType: 'fasting',
    heartRateValue: '',
    weightValue: '',
    temperatureValue: '',
    notes: '',
    symptoms: '',
  },
  inputMethod: 'manual',
  voiceStage: 'idle',
  voiceTranscript: '',
  voiceError: null,
});

describe('health input drafts', () => {
  it('creates an independent draft for every health record type', () => {
    const drafts = createInitialHealthDrafts();

    drafts.blood_pressure.values.systolic = '135';
    drafts.blood_sugar.values.bloodSugarValue = '5.6';

    expect(Object.keys(drafts)).toHaveLength(5);
    expect(drafts.blood_pressure.values.systolic).toBe('135');
    expect(drafts.blood_sugar.values.systolic).toBe('');
    expect(drafts.weight.values.bloodSugarValue).toBe('');
  });

  it('keeps notes, input method and voice state scoped to one tab', () => {
    const drafts = createInitialHealthDrafts();
    drafts.heart_rate.values.notes = '晨起';
    drafts.heart_rate.inputMethod = 'voice';
    drafts.heart_rate.voiceStage = 'review';

    expect(getDirtyHealthRecordTypes(drafts)).toEqual(['heart_rate']);
    expect(drafts.temperature.values.notes).toBe('');
    expect(drafts.temperature.inputMethod).toBe('manual');
    expect(drafts.temperature.voiceStage).toBe('idle');
  });

  it('returns all non-empty drafts in stable tab order for one batch', () => {
    const drafts = createInitialHealthDrafts();
    drafts.weight.values.weightValue = '65';
    drafts.blood_pressure.values.systolic = '120';
    drafts.blood_pressure.values.diastolic = '80';

    expect(getHealthSubmissionTypes(drafts)).toEqual([
      'blood_pressure',
      'weight',
    ] satisfies HealthRecordType[]);
  });

  it('does not submit a voice tab until its result is confirmed', () => {
    const drafts = createInitialHealthDrafts();
    drafts.heart_rate.values.heartRateValue = '72';
    drafts.heart_rate.inputMethod = 'voice';
    drafts.heart_rate.voiceStage = 'review';

    expect(getHealthSubmissionTypes(drafts)).toEqual(['heart_rate']);
    expect(getDirtyHealthRecordTypes(drafts)).toEqual(['heart_rate']);
  });

  it('treats an empty draft as clean even if it was recreated independently', () => {
    const drafts: Record<HealthRecordType, HealthDraft> = {
      blood_pressure: blank(), blood_sugar: blank(), heart_rate: blank(),
      weight: blank(), temperature: blank(),
    };
    expect(getDirtyHealthRecordTypes(drafts)).toEqual([]);
    expect(getHealthSubmissionTypes(drafts)).toEqual([]);
  });
});

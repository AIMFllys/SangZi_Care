'use client';

import { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ageFromBirthDate, daysInMonth, isIsoDate } from '@/lib/utils/age';
import styles from './BirthDateField.module.css';

interface BirthDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

type PickerKind = 'year' | 'month' | 'day';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function parseParts(value: string): { year: string; month: string; day: string } {
  if (!isIsoDate(value)) return { year: '', month: '', day: '' };
  const [year, month, day] = value.split('-');
  return { year, month, day };
}

function toIso(year: string, month: string, day: string): string {
  if (!year || !month || !day) return '';
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  let dayNumber = Number(day);
  const lastDay = daysInMonth(yearNumber, monthNumber);
  if (dayNumber > lastDay) dayNumber = lastDay;
  return `${yearNumber}-${pad(monthNumber)}-${pad(dayNumber)}`;
}

const PICKER_TITLE: Record<PickerKind, string> = {
  year: '选择年份',
  month: '选择月份',
  day: '选择日期',
};

export function BirthDateField({ value, onChange, disabled, required }: BirthDateFieldProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 121 }, (_, index) => currentYear - index);
  const titleId = useId();
  const [draft, setDraft] = useState(() => parseParts(value));
  const [picker, setPicker] = useState<PickerKind | null>(null);
  const { year, month, day } = draft;
  const selectedYear = year ? Number(year) : null;
  const selectedMonth = month ? Number(month) : null;
  const maxDay = selectedYear && selectedMonth
    ? daysInMonth(selectedYear, selectedMonth)
    : 31;
  const iso = toIso(year, month, day);
  const age = ageFromBirthDate(iso || value, today);
  const dayEnabled = Boolean(year && month) && !disabled;

  useEffect(() => {
    if (!isIsoDate(value)) return;
    const next = parseParts(value);
    setDraft((prev) => (
      prev.year === next.year && prev.month === next.month && prev.day === next.day
        ? prev
        : next
    ));
  }, [value]);

  useEffect(() => {
    if (!picker) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPicker(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [picker]);

  const emit = (nextYear: string, nextMonth: string, nextDay: string) => {
    let nextDayClamped = nextDay;
    if (nextYear && nextMonth && nextDay) {
      const lastDay = daysInMonth(Number(nextYear), Number(nextMonth));
      if (Number(nextDay) > lastDay) nextDayClamped = pad(lastDay);
    }
    setDraft({ year: nextYear, month: nextMonth, day: nextDayClamped });
    onChange(toIso(nextYear, nextMonth, nextDayClamped));
  };

  const choose = (kind: PickerKind, nextValue: string) => {
    if (kind === 'year') emit(nextValue, month, day);
    if (kind === 'month') emit(year, nextValue, day);
    if (kind === 'day') emit(year, month, nextValue);
    setPicker(null);
  };

  const options = picker === 'year'
    ? years.map((item) => ({ value: String(item), label: String(item) }))
    : picker === 'month'
      ? Array.from({ length: 12 }, (_, index) => {
          const item = index + 1;
          return { value: pad(item), label: String(item) };
        })
      : Array.from({ length: maxDay }, (_, index) => {
          const item = index + 1;
          return { value: pad(item), label: String(item) };
        });

  const selectedValue = picker === 'year' ? year : picker === 'month' ? month : day;

  return (
    <div className={styles.wrapper}>
      <span className={styles.label} id="profile-birth-label">出生日期</span>
      <div
        className={styles.row}
        role="group"
        aria-labelledby="profile-birth-label"
        aria-required={required || undefined}
      >
        <div className={`${styles.slot} ${styles.slotYear}`}>
          <span className={styles.slotLabel}>年</span>
          <button
            type="button"
            aria-label="出生年份"
            aria-haspopup="dialog"
            aria-expanded={picker === 'year'}
            className={styles.trigger}
            disabled={disabled}
            onClick={() => setPicker('year')}
          >
            <span className={year ? styles.triggerValue : styles.placeholder}>
              {year || '请选择'}
            </span>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.slot}>
          <span className={styles.slotLabel}>月</span>
          <button
            type="button"
            aria-label="出生月份"
            aria-haspopup="dialog"
            aria-expanded={picker === 'month'}
            className={styles.trigger}
            disabled={disabled}
            onClick={() => setPicker('month')}
          >
            <span className={month ? styles.triggerValue : styles.placeholder}>
              {month ? String(Number(month)) : '请选择'}
            </span>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
        </div>
        <div className={styles.slot}>
          <span className={styles.slotLabel}>日</span>
          <button
            type="button"
            aria-label="出生哪一天"
            aria-haspopup="dialog"
            aria-expanded={picker === 'day'}
            className={styles.trigger}
            disabled={!dayEnabled}
            onClick={() => dayEnabled && setPicker('day')}
          >
            <span className={day ? styles.triggerValue : styles.placeholder}>
              {day ? String(Number(day)) : '请选择'}
            </span>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <p className={styles.hint}>
        {age == null ? '请点选年、月、日，健康早筛会按年龄匹配问卷。' : `今年满 ${age} 岁`}
      </p>

      {picker ? (
        <div
          className={styles.overlay}
          role="presentation"
          onClick={() => setPicker(null)}
        >
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className={styles.sheetTitle}>{PICKER_TITLE[picker]}</h2>
            <div
              className={`${styles.choices} ${picker === 'year' ? styles.choicesYear : ''}`}
              role="listbox"
              aria-label={PICKER_TITLE[picker]}
            >
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selectedValue === option.value}
                  className={`${styles.choice} ${selectedValue === option.value ? styles.choiceActive : ''}`}
                  onClick={() => choose(picker, option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={styles.sheetCancel}
              onClick={() => setPicker(null)}
            >
              取消
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

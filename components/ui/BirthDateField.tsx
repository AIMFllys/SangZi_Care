'use client';

import { useEffect, useState } from 'react';
import { ageFromBirthDate, daysInMonth, isIsoDate } from '@/lib/utils/age';
import styles from './BirthDateField.module.css';

interface BirthDateFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
}

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

export function BirthDateField({ value, onChange, disabled, required }: BirthDateFieldProps) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const years = Array.from({ length: 121 }, (_, index) => currentYear - index);
  const [draft, setDraft] = useState(() => parseParts(value));
  const { year, month, day } = draft;
  const selectedYear = year ? Number(year) : null;
  const selectedMonth = month ? Number(month) : null;
  const maxDay = selectedYear && selectedMonth
    ? daysInMonth(selectedYear, selectedMonth)
    : 31;
  const iso = toIso(year, month, day);
  const age = ageFromBirthDate(iso || value, today);

  useEffect(() => {
    if (!isIsoDate(value)) return;
    const next = parseParts(value);
    setDraft((prev) => (
      prev.year === next.year && prev.month === next.month && prev.day === next.day
        ? prev
        : next
    ));
  }, [value]);

  const emit = (nextYear: string, nextMonth: string, nextDay: string) => {
    let nextDayClamped = nextDay;
    if (nextYear && nextMonth && nextDay) {
      const lastDay = daysInMonth(Number(nextYear), Number(nextMonth));
      if (Number(nextDay) > lastDay) nextDayClamped = pad(lastDay);
    }
    setDraft({ year: nextYear, month: nextMonth, day: nextDayClamped });
    onChange(toIso(nextYear, nextMonth, nextDayClamped));
  };

  return (
    <div className={styles.wrapper}>
      <span className={styles.label} id="profile-birth-label">出生日期</span>
      <div
        className={styles.row}
        role="group"
        aria-labelledby="profile-birth-label"
        aria-required={required || undefined}
      >
        <label className={styles.slot}>
          <span className={styles.slotLabel}>年</span>
          <select
            aria-label="出生年份"
            autoComplete="bday-year"
            className={styles.select}
            value={year}
            disabled={disabled}
            required={required}
            onChange={(event) => emit(event.target.value, month, day)}
          >
            <option value="">请选择</option>
            {years.map((item) => (
              <option key={item} value={String(item)}>{item}</option>
            ))}
          </select>
        </label>
        <label className={styles.slot}>
          <span className={styles.slotLabel}>月</span>
          <select
            aria-label="出生月份"
            autoComplete="bday-month"
            className={styles.select}
            value={month}
            disabled={disabled}
            required={required}
            onChange={(event) => emit(year, event.target.value, day)}
          >
            <option value="">请选择</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
              <option key={item} value={pad(item)}>{item}</option>
            ))}
          </select>
        </label>
        <label className={styles.slot}>
          <span className={styles.slotLabel}>日</span>
          <select
            aria-label="出生哪一天"
            autoComplete="bday-day"
            className={styles.select}
            value={day}
            disabled={disabled || !year || !month}
            required={required}
            onChange={(event) => emit(year, month, event.target.value)}
          >
            <option value="">请选择</option>
            {Array.from({ length: maxDay }, (_, index) => index + 1).map((item) => (
              <option key={item} value={pad(item)}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <p className={styles.hint}>
        {age == null ? '请选择年月日，健康早筛会按年龄匹配问卷。' : `今年满 ${age} 岁`}
      </p>
    </div>
  );
}

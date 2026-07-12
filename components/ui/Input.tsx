'use client';

import { InputHTMLAttributes, ReactNode } from 'react';
import styles from './Input.module.css';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'prefix'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  disabled,
  prefix,
  suffix,
  id,
  className,
  ...rest
}: InputProps) {
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`${styles.wrapper} ${className ?? ''}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <div
        className={`${styles.field} ${error ? styles.fieldError : ''} ${disabled ? styles.fieldDisabled : ''}`}
      >
        {prefix && <span className={styles.affix}>{prefix}</span>}
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={styles.input}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...rest}
        />
        {suffix && <span className={styles.affix}>{suffix}</span>}
      </div>
      {error && (
        <p id={`${inputId}-error`} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

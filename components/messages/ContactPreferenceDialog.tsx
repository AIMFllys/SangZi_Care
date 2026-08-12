'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import type { ContactPreference } from '@/lib/contactPreferences';
import styles from './ContactPreferenceDialog.module.css';

interface ContactPreferenceDialogProps {
  ownerId: string;
  peerId: string;
  displayName: string;
  initialAlias: string | null;
  initialPinned: boolean;
  onClose: () => void;
  onSaved: (ownerId: string, peerId: string, preference: ContactPreference) => void;
}

function parsePreference(value: unknown): ContactPreference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('保存响应无效，请重试');
  }
  const record = value as Record<string, unknown>;
  if (
    (record.alias !== null && typeof record.alias !== 'string')
    || typeof record.is_pinned !== 'boolean'
  ) {
    throw new Error('保存响应无效，请重试');
  }
  return { alias: record.alias as string | null, is_pinned: record.is_pinned };
}

export default function ContactPreferenceDialog({
  ownerId,
  peerId,
  displayName,
  initialAlias,
  initialPinned,
  onClose,
  onSaved,
}: ContactPreferenceDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const [alias, setAlias] = useState(initialAlias ?? '');
  const [isPinned, setIsPinned] = useState(initialPinned);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    inputRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !savingRef.current) {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const active = document.activeElement;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeIndex = active instanceof HTMLElement ? focusable.indexOf(active) : -1;
      if (event.shiftKey && (activeIndex <= 0)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeIndex === -1 || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async (): Promise<void> => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    const requestOwnerId = ownerId;
    const normalizedAlias = alias.trim() || null;

    try {
      const response = await fetchApi<unknown>(
        `/api/v1/messages/contacts/${encodeURIComponent(peerId)}`,
        {
          method: 'PUT',
          body: { alias: normalizedAlias, is_pinned: isPinned },
        },
      );
      const preference = parsePreference(response);
      onSaved(requestOwnerId, peerId, preference);
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败，请重试');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !savingRef.current) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h2 id={titleId} className={styles.title}>管理{displayName}</h2>
        <p className={styles.description}>备注和置顶只在您的联系人中生效。</p>

        <Input
          inputRef={inputRef}
          label="备注名"
          value={alias}
          onChange={setAlias}
          maxLength={40}
          disabled={saving}
          placeholder="例如：妈妈、李阿姨"
        />

        <div className={styles.pinRow}>
          <div>
            <span className={styles.pinLabel}>置顶联系人</span>
            <span className={styles.pinHint}>优先显示在联系人列表顶部</span>
          </div>
          <Switch
            checked={isPinned}
            onCheckedChange={setIsPinned}
            aria-label="置顶联系人"
            disabled={saving}
          />
        </div>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.clearRow}>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={saving || alias.length === 0}
            onClick={() => {
              setAlias('');
              inputRef.current?.focus();
            }}
          >
            清除备注
          </Button>
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="secondary" size="lg" disabled={saving} onClick={onClose}>
            取消
          </Button>
          <Button type="button" size="lg" loading={saving} onClick={() => void handleSave()}>
            保存
          </Button>
        </div>
      </section>
    </div>
  );
}

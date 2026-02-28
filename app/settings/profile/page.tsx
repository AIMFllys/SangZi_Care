'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/hooks/useAuth';
import { fetchApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import styles from './page.module.css';

const GENDER_OPTIONS = ['男', '女'] as const;

interface ProfileForm {
  name: string;
  birth_date: string;
  gender: string;
  chronic_diseases: string[];
}

export default function ProfilePage() {
  const router = useRouter();
  const { isReady } = useAuth();
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  const [form, setForm] = useState<ProfileForm>({
    name: '',
    birth_date: '',
    gender: '',
    chronic_diseases: [],
  });
  const [newDisease, setNewDisease] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 初始化表单
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        birth_date: user.birth_date || '',
        gender: user.gender || '',
        chronic_diseases: user.chronic_diseases || [],
      });
    }
  }, [user]);

  function handleAddDisease() {
    const trimmed = newDisease.trim();
    if (!trimmed) return;
    if (form.chronic_diseases.includes(trimmed)) return;
    setForm((prev) => ({
      ...prev,
      chronic_diseases: [...prev.chronic_diseases, trimmed],
    }));
    setNewDisease('');
  }

  function handleRemoveDisease(disease: string) {
    setForm((prev) => ({
      ...prev,
      chronic_diseases: prev.chronic_diseases.filter((d) => d !== disease),
    }));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('请输入姓名');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await fetchApi<typeof user>('/api/v1/users/me', {
        method: 'PATCH',
        body: {
          name: form.name.trim(),
          birth_date: form.birth_date || null,
          gender: form.gender || null,
          chronic_diseases: form.chronic_diseases,
        },
      });
      if (updated) {
        setUser(updated as NonNullable<typeof user>);
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  if (!isReady) {
    return <div className={styles.loading}>加载中…</div>;
  }

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push(ROUTES.SETTINGS)}
          aria-label="返回设置"
        >
          ‹ 返回
        </button>
        <h1 className={styles.title}>个人信息</h1>
      </div>

      {success && (
        <div className={styles.successBanner} role="status">保存成功</div>
      )}
      {error && (
        <div className={styles.errorBanner} role="alert">{error}</div>
      )}

      <section className={styles.section}>
        <div className={styles.formGroup}>
          <label htmlFor="profile-name" className={styles.formLabel}>姓名</label>
          <input
            id="profile-name"
            type="text"
            value={form.name}
            onChange={(e) => {
              setForm((p) => ({ ...p, name: e.target.value }));
              setError(null);
              setSuccess(false);
            }}
            placeholder="请输入姓名"
            className={styles.formInput}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="profile-birth" className={styles.formLabel}>出生日期</label>
          <input
            id="profile-birth"
            type="date"
            value={form.birth_date}
            onChange={(e) => {
              setForm((p) => ({ ...p, birth_date: e.target.value }));
              setSuccess(false);
            }}
            className={styles.formInput}
          />
        </div>

        <div className={styles.formGroup}>
          <span className={styles.formLabel}>性别</span>
          <div className={styles.genderGrid} role="radiogroup" aria-label="性别选择">
            {GENDER_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={form.gender === g}
                className={`${styles.genderChip} ${form.gender === g ? styles.genderChipActive : ''}`}
                onClick={() => {
                  setForm((p) => ({ ...p, gender: g }));
                  setSuccess(false);
                }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <span className={styles.formLabel}>慢性病</span>
          {form.chronic_diseases.length > 0 && (
            <div className={styles.diseaseList}>
              {form.chronic_diseases.map((d) => (
                <span key={d} className={styles.diseaseTag}>
                  {d}
                  <button
                    type="button"
                    className={styles.diseaseRemove}
                    onClick={() => handleRemoveDisease(d)}
                    aria-label={`移除${d}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className={styles.diseaseInputRow}>
            <input
              type="text"
              value={newDisease}
              onChange={(e) => setNewDisease(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddDisease();
                }
              }}
              placeholder="输入慢性病名称"
              className={styles.diseaseInput}
              aria-label="添加慢性病"
            />
            <button
              type="button"
              className={styles.diseaseAddBtn}
              onClick={handleAddDisease}
              disabled={!newDisease.trim()}
              aria-label="添加"
            >
              +
            </button>
          </div>
        </div>
      </section>

      <button
        className={styles.saveButton}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? '保存中…' : '保存'}
      </button>
    </main>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useAuthContext } from '@/components/providers/AuthProvider';
import { fetchApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import { User, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IconButton } from '@/components/ui/IconButton';
import PageHeader from '@/components/layout/PageHeader';
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
  const { isReady } = useAuthContext();
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
    return (
      <div className={styles.page}>
        <div className={styles.loading}>加载中…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
        <PageHeader
          title="个人信息"
          variant="detail"
          backHref={ROUTES.SETTINGS}
          backAriaLabel="返回设置"
          transparent
        />

        {success && (
          <div className={styles.successBanner} role="status">
            保存成功
          </div>
        )}
        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        <div className={styles.avatarSection}>
          <div className={styles.avatar}>
            <User size={40} color="var(--accent)" />
          </div>
        </div>

        <section className={styles.form} aria-label="个人信息表单">
          <Input
            id="profile-name"
            label="姓名"
            value={form.name}
            onChange={(value) => {
              setForm((p) => ({ ...p, name: value }));
              setError(null);
              setSuccess(false);
            }}
            placeholder="请输入姓名"
          />

          <Input
            id="profile-birth"
            label="出生日期"
            type="date"
            value={form.birth_date}
            onChange={(value) => {
              setForm((p) => ({ ...p, birth_date: value }));
              setSuccess(false);
            }}
          />

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
                    <IconButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveDisease(d)}
                      aria-label={`移除${d}`}
                    >
                      <X size={16} />
                    </IconButton>
                  </span>
                ))}
              </div>
            )}
            <div className={styles.diseaseInputRow}>
              <Input
                value={newDisease}
                onChange={setNewDisease}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDisease();
                  }
                }}
                placeholder="输入慢性病名称"
                aria-label="添加慢性病"
                className={styles.diseaseInput}
              />
              <IconButton
                size="md"
                variant="soft"
                onClick={handleAddDisease}
                disabled={!newDisease.trim()}
                aria-label="添加"
              >
                <Plus size={20} />
              </IconButton>
            </div>
          </div>
        </section>

        <div className={styles.actions}>
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onClick={() => router.push(ROUTES.SETTINGS)}
          >
            取消
          </Button>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSave}
            loading={saving}
          >
            保存
          </Button>
        </div>
    </div>
  );
}

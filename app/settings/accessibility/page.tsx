'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useAuth } from '@/hooks/useAuth';
import { fetchApi } from '@/lib/api';
import { ROUTES } from '@/lib/constants';
import styles from './page.module.css';

/** 字体大小选项 */
export const FONT_SIZE_OPTIONS = [
  { key: 'normal', label: '标准', sample: '16px' },
  { key: 'large', label: '大字', sample: '20px' },
  { key: 'xlarge', label: '特大', sample: '24px' },
] as const;

/** 字体大小 CSS 变量映射 */
const FONT_SIZE_CSS: Record<string, Record<string, string>> = {
  normal: {
    '--font-size-base': '16px',
    '--font-size-lg': '20px',
    '--font-size-xl': '24px',
    '--font-size-title': '28px',
  },
  large: {
    '--font-size-base': '20px',
    '--font-size-lg': '24px',
    '--font-size-xl': '28px',
    '--font-size-title': '32px',
  },
  xlarge: {
    '--font-size-base': '24px',
    '--font-size-lg': '28px',
    '--font-size-xl': '32px',
    '--font-size-title': '36px',
  },
};

/** 应用字体大小到全局 CSS 变量 */
export function applyFontSize(size: string) {
  if (typeof document === 'undefined') return;
  const vars = FONT_SIZE_CSS[size];
  if (!vars) return;
  const root = document.documentElement;
  Object.entries(vars).forEach(([prop, val]) => {
    root.style.setProperty(prop, val);
  });
}

export default function AccessibilityPage() {
  const router = useRouter();
  const { isReady } = useAuth();
  const user = useUserStore((s) => s.user);
  const setUser = useUserStore((s) => s.setUser);

  const [fontSize, setFontSize] = useState('normal');
  const [voiceSpeed, setVoiceSpeed] = useState(0.8);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 初始化
  useEffect(() => {
    if (user) {
      setFontSize(user.font_size || 'normal');
      setVoiceSpeed(user.voice_speed ?? 0.8);
    }
  }, [user]);

  // 字体大小即时预览
  function handleFontSizeChange(size: string) {
    setFontSize(size);
    applyFontSize(size);
    setSuccess(false);
  }

  function handleVoiceSpeedChange(speed: number) {
    setVoiceSpeed(speed);
    setSuccess(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await fetchApi<typeof user>('/api/v1/users/me', {
        method: 'PATCH',
        body: {
          font_size: fontSize,
          voice_speed: voiceSpeed,
        },
      });
      if (updated) {
        setUser(updated as NonNullable<typeof user>);
      }
      applyFontSize(fontSize);
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
        <h1 className={styles.title}>无障碍设置</h1>
      </div>

      {success && (
        <div className={styles.successBanner} role="status">保存成功</div>
      )}
      {error && (
        <div className={styles.errorBanner} role="alert">{error}</div>
      )}

      {/* 字体大小 */}
      <section className={styles.section} aria-label="字体大小设置">
        <h2 className={styles.sectionTitle}>字体大小</h2>
        <p className={styles.sectionDesc}>选择适合您的字体大小，立即预览效果</p>
        <div className={styles.sizeOptions} role="radiogroup" aria-label="字体大小">
          {FONT_SIZE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={fontSize === opt.key}
              className={`${styles.sizeOption} ${fontSize === opt.key ? styles.sizeOptionActive : ''}`}
              onClick={() => handleFontSizeChange(opt.key)}
            >
              <span className={styles.sizeOptionLabel} style={{ fontSize: opt.sample }}>
                {opt.label}
              </span>
            </button>
          ))}
        </div>
        <div className={styles.previewCard} aria-label="字体预览">
          <p className={styles.previewTitle}>预览效果</p>
          <p className={styles.previewBody}>
            桑梓智护，让关爱更近一步。这是当前字体大小的预览文字。
          </p>
        </div>
      </section>

      {/* 语音速度 */}
      <section className={styles.section} aria-label="语音速度设置">
        <h2 className={styles.sectionTitle}>语音播放速度</h2>
        <p className={styles.sectionDesc}>调整语音助手和健康广播的播放速度</p>
        <div className={styles.sliderRow}>
          <span className={styles.sliderLabel}>慢</span>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={voiceSpeed}
            onChange={(e) => handleVoiceSpeedChange(parseFloat(e.target.value))}
            className={styles.slider}
            aria-label="语音速度"
            aria-valuemin={0.5}
            aria-valuemax={1.5}
            aria-valuenow={voiceSpeed}
          />
          <span className={styles.sliderLabel}>快</span>
          <span className={styles.sliderValue}>{voiceSpeed.toFixed(1)}x</span>
        </div>
      </section>

      <button
        className={styles.saveButton}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? '保存中…' : '保存设置'}
      </button>
    </main>
  );
}

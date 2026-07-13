'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { fetchApi } from '@/lib/api';
import { Sun, Mic, Phone } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import styles from '../../app/page.module.css';

/** 日期格式化 */
function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const hours = now.getHours().toString().padStart(2, '0');
  const mins = now.getMinutes().toString().padStart(2, '0');
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekday = weekdays[now.getDay()];

  return { time: `${hours}:${mins}`, date: `${month}月${day}日 星期${weekday}`, hour: now.getHours() };
}

/** 时段问候语 */
function getGreeting(hour: number): string {
  if (hour < 6) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

/**
 * Elder 端首页 — 大语音球 + 时间卡 + SOS
 */
export default function ElderHomeView() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const { time, date, hour } = useCurrentTime();
  const name = user?.name || '您';
  const [sosLoading, setSosLoading] = useState(false);
  const [sosMessage, setSosMessage] = useState('');

  async function handleEmergency() {
    if (sosLoading) return;
    setSosLoading(true);
    setSosMessage('');
    try {
      await fetchApi('/api/v1/emergency/trigger', {
        method: 'POST',
        body: { trigger_method: 'button' },
      });
      setSosMessage('紧急求助已发出，已通知家属');
    } catch (error) {
      setSosMessage(error instanceof Error ? error.message : '求助发送失败，请立即拨打 120');
    } finally {
      setSosLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      {/* 问候 */}
      <div className={styles.greeting}>
        <h1 className={styles.greetingText}>
          {getGreeting(hour)}，
          <br />
          {name}
        </h1>
      </div>

      {/* 时间天气卡 */}
      <Card variant="glass" className={styles.timeCard}>
        <div>
          <div className={styles.time}>{time}</div>
          <div className={styles.dateText}>{date}</div>
        </div>
        <div className={styles.weather}>
          <span className={styles.weatherIcon}>
            <Sun size={32} color="var(--accent)" />
          </span>
          <span className={styles.weatherTemp}>24° 晴</span>
        </div>
      </Card>

      {/* 语音球 */}
      <div className={styles.voiceSection}>
        <button
          type="button"
          className={styles.voiceBallWrapper}
          onClick={() => router.push('/voice')}
          aria-label="点我说话，开启语音助手"
        >
          <div className={styles.voiceBallRing} />
          <div className={styles.voiceBallRing} />
          <div className={`${styles.voiceBall} interactive`}>
            <span className={styles.voiceIcon}>
              <Mic size={56} />
            </span>
          </div>
        </button>
        <p className={styles.voiceLabel}>点我说话</p>
      </div>

      {sosMessage && <p className={styles.sosMessage} role="status">{sosMessage}</p>}

      <Button
        variant="danger"
        size="lg"
        fullWidth
        leftIcon={<Phone size={24} />}
        className={styles.sosButton}
        onClick={handleEmergency}
        loading={sosLoading}
        aria-label="紧急呼叫 SOS"
      >
        紧急呼叫 (SOS)
      </Button>
    </div>
  );
}

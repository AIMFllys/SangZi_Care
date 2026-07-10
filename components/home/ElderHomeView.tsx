'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { Sun, Mic, ChevronUp, Phone } from 'lucide-react';
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
      <div className={`glass-card ${styles.timeCard}`}>
        <div>
          <div className={styles.time}>{time}</div>
          <div className={styles.dateText}>{date}</div>
        </div>
        <div className={styles.weather}>
          <span className={styles.weatherIcon}><Sun size={28} /></span>
          <span className={styles.weatherTemp}>24° 晴</span>
        </div>
      </div>

      {/* 语音球 */}
      <div className={styles.voiceSection}>
        <div
          className={styles.voiceBallWrapper}
          onClick={() => router.push('/voice')}
          role="button"
          aria-label="点我说话，开启语音助手"
        >
          <div className={styles.voiceBallRing} />
          <div className={styles.voiceBallRing} />
          <div className={`${styles.voiceBall} interactive`}>
            <span className={styles.voiceIcon}><Mic size={56} color="currentColor" /></span>
          </div>
        </div>
        <p className={styles.voiceLabel}>点我说话</p>
      </div>

      {/* 上滑提示 */}
      <div className={styles.swipeHint}>
        <span className={styles.swipeArrow}><ChevronUp size={24} /></span>
        <span>上滑更多功能</span>
      </div>

      {/* 紧急呼叫 — TODO: T5.1 实装后指向 /emergency */}
      <button
        className={styles.sosButton}
        onClick={() => router.push('/settings')}
        aria-label="紧急呼叫 SOS"
      >
        <Phone size={24} className={styles.sosIcon} />
        紧急呼叫 (SOS)
      </button>
    </div>
  );
}

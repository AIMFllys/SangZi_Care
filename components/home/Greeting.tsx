'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';
import styles from './Greeting.module.css';

// ---- 时段问候语 ----

/** 根据当前小时返回中文问候语 */
export function getGreetingByHour(hour: number): string {
  if (hour >= 5 && hour <= 11) return '早上好';
  if (hour >= 12 && hour <= 13) return '中午好';
  if (hour >= 14 && hour <= 17) return '下午好';
  if (hour >= 18 && hour <= 22) return '晚上好';
  return '夜深了，注意休息';
}

// ---- 天气信息接口 ----

export interface WeatherInfo {
  /** 天气描述，如 "晴" "多云" "小雨" */
  description: string;
  /** 温度（摄氏度） */
  temperature: number;
  /** 天气图标（emoji 或图标名） */
  icon?: string;
}

// ---- 组件 Props ----

export interface GreetingProps {
  /** 天气信息（可选，不传则显示占位） */
  weather?: WeatherInfo;
}

// ---- 主组件 ----

export function Greeting({ weather }: GreetingProps) {
  const user = useUserStore((s) => s.user);
  const [greeting, setGreeting] = useState('');

  // 客户端获取当前时段问候语，每分钟刷新
  useEffect(() => {
    const update = () => setGreeting(getGreetingByHour(new Date().getHours()));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);

  const displayName = user?.name || '您';

  return (
    <section className={styles.container} aria-label="问候语与天气">
      {/* 问候语 */}
      <h2 className={styles.greeting}>
        {greeting}，{displayName}
      </h2>

      {/* 天气信息 */}
      <div className={styles.weather} aria-label="天气信息">
        {weather ? (
          <>
            {weather.icon && (
              <span className={styles.weatherIcon} aria-hidden="true">
                {weather.icon}
              </span>
            )}
            <span className={styles.weatherText}>
              {weather.description} {weather.temperature}°C
            </span>
          </>
        ) : (
          <span className={styles.weatherPlaceholder}>天气加载中…</span>
        )}
      </div>
    </section>
  );
}

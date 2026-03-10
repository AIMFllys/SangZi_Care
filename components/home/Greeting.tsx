'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/stores/userStore';

export function getGreetingByHour(hour: number): string {
  if (hour >= 5 && hour <= 11) return '早上好';
  if (hour >= 12 && hour <= 13) return '中午好';
  if (hour >= 14 && hour <= 17) return '下午好';
  if (hour >= 18 && hour <= 22) return '晚上好';
  return '夜深了，注意休息';
}

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

export interface GreetingProps {
  weather?: { description: string; temperature: number; icon?: string };
}

export function Greeting({ weather }: GreetingProps) {
  const user = useUserStore((s) => s.user);
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setGreeting(getGreetingByHour(now.getHours()));
      setCurrentTime(`${padZero(now.getHours())}:${padZero(now.getMinutes())}`);
      setCurrentDate(`${now.getMonth() + 1}月${now.getDate()}日 ${WEEKDAYS[now.getDay()]}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const displayName = user?.name || '您';

  return (
    <header className="flex flex-col gap-6" aria-label="问候语与天气">
      <div className="flex flex-col leading-tight tracking-tight">
        <h1 className="text-4xl text-[var(--color-text-secondary)] font-medium">
          {greeting}，
        </h1>
        <h2 className="text-5xl font-bold text-[var(--color-primary-dark)] mt-2">
          {displayName}
        </h2>
      </div>
    </header>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { BrandMark } from '@/components/brand/BrandMark';
import styles from './SplashScreen.module.css';

const SPLASH_KEY = 'sangzi.splash.seen.v1';
const SPLASH_MS = 2400;
const ANDROID_SHELL_UA = 'SangZiSmartCareAndroid';

interface SplashScreenProps {
  onFinished: () => void;
  stayVisible?: boolean;
}

function shouldSkipSplash(): boolean {
  try {
    if (window.sessionStorage.getItem(SPLASH_KEY) === '1') return true;
    if (navigator.userAgent.includes(ANDROID_SHELL_UA)) return true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  } catch {
    return false;
  }
  return false;
}

export function SplashScreen({ onFinished, stayVisible = false }: SplashScreenProps) {
  const [mode, setMode] = useState<'boot' | 'play' | 'done'>('boot');
  const finishedRef = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      try {
        window.sessionStorage.setItem(SPLASH_KEY, '1');
      } catch {
        // sessionStorage 不可用时仍结束开屏
      }
      setMode('done');
      onFinished();
    };

    if (shouldSkipSplash()) {
      finish();
      return;
    }

    setMode('play');
    const timer = window.setTimeout(finish, SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, [onFinished]);

  if (mode === 'done' && !stayVisible) return null;

  return (
    <div className={styles.splash} role="dialog" aria-label="智护银龄开屏" aria-live="polite">
      <div className={styles.glow} aria-hidden="true" />
      <BrandMark size={108} animated={mode === 'play'} />
      <p className={styles.wordmark} data-animate={mode === 'play'} aria-label="智护银龄">
        {'智护银龄'.split('').map((char) => (
          <span key={char}>{char}</span>
        ))}
      </p>
      <p className={styles.tagline} data-animate={mode === 'play'}>
        科技有温度，守护有回应
      </p>
    </div>
  );
}

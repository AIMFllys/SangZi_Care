'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { fetchApi } from '@/lib/api';
import styles from './login.module.css';

interface SendCodeResponse {
  success: boolean;
  expires_in: number;
}

interface VerifyResponse {
  access_token: string;
  refresh_token: string;
  user: { id: string; role: string | null };
  is_new_user: boolean;
}

const PHONE_REGEX = /^1[3-9]\d{9}$/;
const CODE_LENGTH = 6;
const COUNTDOWN_SECONDS = 60;

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const [sendingCode, setSendingCode] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // --- Countdown logic ---
  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // --- Phone validation ---
  const isPhoneValid = PHONE_REGEX.test(phone);
  const isCodeValid = code.length === CODE_LENGTH && /^\d+$/.test(code);

  // --- Send verification code ---
  const handleSendCode = async () => {
    if (!isPhoneValid || countdown > 0 || sendingCode) return;
    setError('');
    setSendingCode(true);
    try {
      await fetchApi<SendCodeResponse>('/api/v1/auth/send-code', {
        method: 'POST',
        body: { phone },
      });
      startCountdown();
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码发送失败，请稍后重试');
    } finally {
      setSendingCode(false);
    }
  };

  // --- Login ---
  const handleLogin = async () => {
    if (!isPhoneValid || !isCodeValid || loggingIn) return;
    setError('');
    setLoggingIn(true);
    try {
      const res = await fetchApi<VerifyResponse>('/api/v1/auth/verify', {
        method: 'POST',
        body: { phone, code },
      });

      localStorage.setItem('token', res.access_token);
      localStorage.setItem('refresh_token', res.refresh_token);

      if (res.is_new_user) {
        router.push('/onboarding');
      } else {
        router.push('/');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败';
      if (msg.includes('过期')) {
        setError('验证码已过期，请重新获取');
      } else {
        setError('验证码错误，请重新输入');
      }
    } finally {
      setLoggingIn(false);
    }
  };

  // --- Send code button label ---
  const sendCodeLabel =
    countdown > 0 ? `${countdown}秒后重发` : '发送验证码';

  return (
    <div className={styles.container}>
      {/* Logo */}
      <div className={styles.logoSection}>
        <div className={styles.logoIcon}>
          <span className={styles.logoEmoji} role="img" aria-label="桑梓智护">
            🏡
          </span>
        </div>
        <h1 className={styles.appTitle}>桑梓智护</h1>
        <p className={styles.appSubtitle}>AI智慧医养助手</p>
      </div>

      {/* Form */}
      <div className={styles.form}>
        {/* Phone input */}
        <div className={styles.phoneRow}>
          <span className={styles.countryCode}>+86</span>
          <div className={styles.phoneInput}>
            <Input
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="请输入手机号"
              maxLength={11}
              aria-label="手机号"
            />
          </div>
        </div>

        {/* Code input + send button */}
        <div className={styles.codeRow}>
          <div className={styles.codeInput}>
            <Input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, CODE_LENGTH))}
              placeholder="请输入验证码"
              maxLength={CODE_LENGTH}
              aria-label="验证码"
            />
          </div>
          <div className={styles.sendCodeBtn}>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              disabled={!isPhoneValid || countdown > 0}
              loading={sendingCode}
              onClick={handleSendCode}
            >
              {sendCodeLabel}
            </Button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className={styles.errorMessage} role="alert">
            {error}
          </p>
        )}

        {/* Login button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!isPhoneValid || !isCodeValid}
          loading={loggingIn}
          onClick={handleLogin}
        >
          登录
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, IconButton } from '@/components/ui';
import { fetchApi } from '@/lib/api';
import { HeartPulse, Mail, Calculator, RefreshCw, KeyRound, Send } from 'lucide-react';
import styles from './login.module.css';

interface CaptchaResponse {
  captcha_id: string;
  question: string;
}

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_LENGTH = 6;
const COUNTDOWN_SECONDS = 60;

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  // CAPTCHA state
  const [captchaId, setCaptchaId] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

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

  // --- Load CAPTCHA ---
  const loadCaptcha = useCallback(async () => {
    setCaptchaLoading(true);
    setCaptchaAnswer('');
    try {
      const res = await fetchApi<CaptchaResponse>('/api/v1/auth/captcha', {
        skipAuth: true,
      });
      setCaptchaId(res.captcha_id);
      setCaptchaQuestion(res.question);
    } catch {
      setError('获取验证问题失败，请刷新页面');
    } finally {
      setCaptchaLoading(false);
    }
  }, []);

  // Load CAPTCHA on mount
  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

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

  // --- Validation ---
  const isEmailValid = EMAIL_REGEX.test(email);
  const isCodeValid = code.length === CODE_LENGTH && /^\d+$/.test(code);
  const isCaptchaFilled = captchaAnswer.trim().length > 0;

  // --- Send verification code ---
  const handleSendCode = async () => {
    if (!isEmailValid || countdown > 0 || sendingCode || !isCaptchaFilled) return;
    setError('');
    setSendingCode(true);
    try {
      await fetchApi<SendCodeResponse>('/api/v1/auth/send-code', {
        method: 'POST',
        body: {
          email,
          captcha_id: captchaId,
          captcha_answer: parseInt(captchaAnswer, 10),
        },
        skipAuth: true,
      });
      startCountdown();
      // Load a fresh CAPTCHA for next time
      loadCaptcha();
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码发送失败，请稍后重试');
      // Reload CAPTCHA on failure
      loadCaptcha();
    } finally {
      setSendingCode(false);
    }
  };

  // --- Login ---
  const handleLogin = async () => {
    if (!isEmailValid || !isCodeValid || loggingIn) return;
    setError('');
    setLoggingIn(true);
    try {
      const res = await fetchApi<VerifyResponse>('/api/v1/auth/verify', {
        method: 'POST',
        body: { email, code },
        skipAuth: true,
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
  const sendCodeLabel = countdown > 0 ? `${countdown}秒后重发` : '发送验证码';

  return (
    <div className={styles.container}>
      {/* Logo */}
      <div className={styles.logoSection}>
        <div className={styles.logoIcon}>
          <HeartPulse size={48} color="var(--accent-text)" />
        </div>
        <h1 className={styles.appTitle}>桑梓智护</h1>
        <p className={styles.appSubtitle}>AI智慧医养助手</p>
      </div>

      {/* Form */}
      <div className={styles.form}>
        {/* Email input */}
        <Input
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="请输入邮箱地址"
          aria-label="邮箱地址"
          prefix={<Mail size={20} color="var(--text-muted)" />}
        />

        {/* CAPTCHA row */}
        <div className={styles.captchaRow}>
          <Card variant="solid" className={styles.captchaQuestion}>
            {captchaLoading ? (
              <span className={styles.captchaLoading}>加载中...</span>
            ) : (
              <>
                <span className={styles.captchaLabel}>
                  <Calculator size={20} />
                </span>
                <span className={styles.captchaText}>{captchaQuestion}</span>
              </>
            )}
          </Card>
          <Input
            type="text"
            inputMode="numeric"
            value={captchaAnswer}
            onChange={(v) => setCaptchaAnswer(v.replace(/[^\d-]/g, ''))}
            placeholder="答案"
            aria-label="人机验证答案"
            className={styles.captchaInput}
          />
          <IconButton
            variant="soft"
            aria-label="刷新验证题"
            onClick={loadCaptcha}
            disabled={captchaLoading}
          >
            <RefreshCw size={20} />
          </IconButton>
        </div>

        {/* Code input + send button */}
        <Input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, CODE_LENGTH))}
          placeholder="请输入验证码"
          maxLength={CODE_LENGTH}
          aria-label="验证码"
          prefix={<KeyRound size={20} color="var(--text-muted)" />}
          suffix={
            <Button
              variant="soft"
              size="md"
              disabled={!isEmailValid || countdown > 0 || !isCaptchaFilled || sendingCode}
              loading={sendingCode}
              onClick={handleSendCode}
              leftIcon={<Send size={20} />}
            >
              {sendCodeLabel}
            </Button>
          }
        />

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
          disabled={!isEmailValid || !isCodeValid}
          loading={loggingIn}
          onClick={handleLogin}
        >
          登录
        </Button>
      </div>
    </div>
  );
}

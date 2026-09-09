'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Input, IconButton } from '@/components/ui';
import { BrandMark } from '@/components/brand/BrandMark';
import { fetchApi } from '@/lib/api';
import { replaceDocument } from '@/lib/browserNavigation';
import { Mail, RefreshCw, KeyRound, Send, ChevronLeft } from 'lucide-react';
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

type LoginStep = 1 | 2 | 3;

export default function LoginPage() {
  const [step, setStep] = useState<LoginStep>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const [captchaId, setCaptchaId] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const [sendingCode, setSendingCode] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

  useEffect(() => {
    if (step === 3) {
      codeInputRef.current?.focus();
    }
  }, [step]);

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

  const isEmailValid = EMAIL_REGEX.test(email);
  const isCodeValid = code.length === CODE_LENGTH && /^\d+$/.test(code);
  const isCaptchaFilled = captchaAnswer.trim().length > 0;

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
      setStep(3);
      loadCaptcha();
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码发送失败，请稍后重试');
      loadCaptcha();
    } finally {
      setSendingCode(false);
    }
  };

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

      replaceDocument(res.is_new_user ? '/onboarding' : '/');
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

  const sendCodeLabel = countdown > 0 ? `${countdown}秒后重发` : '发送验证码';
  const compactSendCodeLabel = countdown > 0 ? `${countdown}秒` : '发送';
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => `${a}${'•'.repeat(Math.min(b.length, 6))}${c}`);

  return (
    <div className={styles.container}>
      <div className={styles.atmosphere} aria-hidden="true" />

      <div className={styles.logoSection}>
        <BrandMark size={84} animated />
        <h1 className={styles.appTitle}>桑梓智护</h1>
        <p className={styles.appSubtitle}>用邮箱验证码进入，守护家中长辈</p>
      </div>

      <ol className={styles.steps} aria-label="登录步骤">
        {['填写邮箱', '确认本人', '输入验证码'].map((label, index) => {
          const value = (index + 1) as LoginStep;
          const current = value === step;
          const done = value < step;
          return (
            <li
              key={label}
              className={`${styles.step} ${current ? styles.stepCurrent : ''} ${done ? styles.stepDone : ''}`}
              aria-current={current ? 'step' : undefined}
            >
              <span className={styles.stepIndex}>{value}</span>
              <span className={styles.stepLabel}>{label}</span>
            </li>
          );
        })}
      </ol>

      <div className={styles.form}>
        {step > 1 && (
          <button
            type="button"
            className={styles.back}
            onClick={() => {
              setError('');
              setStep((current) => (current === 3 ? 2 : 1) as LoginStep);
            }}
          >
            <ChevronLeft size={20} />
            返回上一步
          </button>
        )}

        {step === 1 && (
          <>
            <Input
              id="login-email"
              label="您的邮箱"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(value) => {
                setEmail(value.trim());
                setError('');
              }}
              placeholder="例如 name@example.com"
              prefix={<Mail size={20} color="var(--text-muted)" />}
            />
            <p className={styles.help}>验证码会发到这个邮箱。我们只用它登录，不会推销，也不会打电话。</p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!isEmailValid}
              onClick={() => {
                setError('');
                setStep(2);
              }}
            >
              下一步
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <p className={styles.help}>
              先算一道简单算术，确认是您本人在操作，然后把验证码发到
              <strong> {email}</strong>
            </p>
            <div className={styles.captchaRow}>
              <div className={styles.captchaQuestion} aria-live="polite">
                {captchaLoading ? (
                  <span className={styles.captchaLoading}>加载中...</span>
                ) : (
                  <span className={styles.captchaText}>{captchaQuestion}</span>
                )}
              </div>
              <Input
                id="login-captcha"
                label="算术答案"
                type="text"
                inputMode="numeric"
                value={captchaAnswer}
                onChange={(value) => setCaptchaAnswer(value.replace(/[^\d-]/g, ''))}
                placeholder="得数"
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
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!isEmailValid || countdown > 0 || !isCaptchaFilled || sendingCode}
              loading={sendingCode}
              onClick={handleSendCode}
              leftIcon={<Send size={20} />}
              aria-label={sendCodeLabel}
            >
              <span className={styles.sendCodeLabelFull}>{sendCodeLabel}</span>
              <span className={styles.sendCodeLabelCompact} aria-hidden="true">
                {compactSendCodeLabel}
              </span>
            </Button>
          </>
        )}

        {step === 3 && (
          <>
            <p className={styles.help}>
              6 位验证码已发到 <strong>{maskedEmail}</strong>。请在 10 分钟内填写。
            </p>
            <div className={styles.otpBlock}>
              <div
                className={styles.otpSlots}
                aria-hidden="true"
                onClick={() => codeInputRef.current?.focus()}
              >
                {Array.from({ length: CODE_LENGTH }, (_, index) => (
                  <span
                    key={index}
                    className={`${styles.otpSlot} ${code[index] ? styles.otpFilled : ''} ${code.length === index ? styles.otpActive : ''}`}
                  >
                    {code[index] ?? ''}
                  </span>
                ))}
              </div>
              <Input
                id="login-code"
                label="邮箱验证码"
                inputRef={codeInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(value) => setCode(value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
                placeholder="请输入 6 位数字"
                maxLength={CODE_LENGTH}
                aria-label="验证码"
                prefix={<KeyRound size={20} color="var(--text-muted)" />}
              />
            </div>
            <button
              type="button"
              className={styles.resend}
              disabled={countdown > 0 || sendingCode}
              onClick={() => setStep(2)}
            >
              {countdown > 0 ? `${countdown} 秒后可重新发送` : '没有收到？返回重发'}
            </button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!isEmailValid || !isCodeValid}
              loading={loggingIn}
              onClick={handleLogin}
            >
              进入智护银龄
            </Button>
          </>
        )}

        {error && (
          <p className={styles.errorMessage} role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

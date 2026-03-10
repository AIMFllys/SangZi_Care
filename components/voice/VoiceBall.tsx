'use client';

// ============================================================
// VoiceBall 语音球组件
// ============================================================

import { useCallback } from 'react';

export type VoiceBallState = 'idle' | 'listening' | 'processing' | 'responding';

export interface VoiceBallProps {
  state?: VoiceBallState;
  onActivate?: () => void;
}

const STATE_ICONS: Record<VoiceBallState, string> = {
  idle: '🎤',
  listening: '👂',
  processing: '💭',
  responding: '💬',
};

const STATE_LABELS: Record<VoiceBallState, string> = {
  idle: '点我说话',
  listening: '正在聆听...',
  processing: '正在思考...',
  responding: '回复中...',
};

const STATE_ARIA: Record<VoiceBallState, string> = {
  idle: '语音助手，点击开始说话',
  listening: '正在聆听，再次点击停止',
  processing: '正在处理您的语音',
  responding: '小护正在回复',
};

export default function VoiceBall({
  state = 'idle',
  onActivate,
}: VoiceBallProps) {
  const handleClick = useCallback(() => {
    onActivate?.();
  }, [onActivate]);

  let ballTransform = 'scale-100';
  let ballBg = 'linear-gradient(to bottom right, var(--color-primary), var(--color-primary-dark))';

  if (state === 'listening') {
    ballTransform = 'scale-105';
    ballBg = 'linear-gradient(135deg, var(--color-primary), #E67E22)';
  } else if (state === 'responding') {
    ballBg = 'linear-gradient(to bottom right, var(--color-primary-light), var(--color-primary))';
  }

  return (
    <div className="flex flex-col items-center justify-center relative w-full pt-2">
      <div className="relative flex items-center justify-center w-full my-auto h-[350px]">
        {/* 背景静止装饰圆环 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-0 w-[520px] h-[520px] bg-[var(--color-primary)] opacity-[0.05]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-[1] w-[400px] h-[400px] bg-[var(--color-primary)] opacity-[0.08]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none z-[2] w-[300px] h-[300px] bg-gradient-to-b from-[var(--color-primary-light)] to-[var(--color-surface)] opacity-70" />

        {/* 动态涟漪 (Listening state) */}
        {state === 'listening' && (
          <>
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] rounded-full z-10 pointer-events-none bg-[var(--color-primary)]/30 animate-ping" style={{ animationDuration: '2s' }} />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] rounded-full z-10 pointer-events-none bg-[var(--color-primary)]/20 animate-ping delay-500" style={{ animationDuration: '2s' }} />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] rounded-full z-10 pointer-events-none bg-[var(--color-primary)]/10 animate-ping delay-1000" style={{ animationDuration: '2s' }} />
          </>
        )}

        {/* Processing 旋转环 */}
        {state === 'processing' && (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full border-4 border-transparent border-t-[var(--color-primary-light)] border-r-[var(--color-primary)] animate-spin pointer-events-none z-10" />
        )}

        {/* 语音球主体 */}
        <button
          className={`relative z-20 w-[240px] h-[240px] rounded-full text-white flex flex-col items-center justify-center border-4 border-white/30 outline outline-8 outline-white/50 shadow-[0_24px_48px_rgba(255,143,68,0.4),inset_0_4px_12px_rgba(255,255,255,0.4)] interactive transition-all duration-300 ${state === 'idle' ? 'animate-pulse' : ''} ${ballTransform}`}
          style={{ background: ballBg }}
          onClick={handleClick}
          aria-label={STATE_ARIA[state]}
          aria-live="polite"
          type="button"
        >
          <span className="text-[100px] leading-none drop-shadow-md" role="img" aria-hidden="true">
            {STATE_ICONS[state]}
          </span>
        </button>
      </div>

      {/* 状态大文字 */}
      <div className="mt-6 text-center flex flex-col items-center gap-2 relative z-30">
        <h2 className="text-[40px] font-black tracking-widest text-[#171717]" aria-live="polite">
          {STATE_LABELS[state]}
        </h2>
      </div>
    </div>
  );
}

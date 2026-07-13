'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAIChat } from '@/hooks/useAIChat';
import { Mic, Bot, Square, Settings } from 'lucide-react';
import { Button, Card, IconButton } from '@/components/ui';
import PageHeader from '@/components/layout/PageHeader';
import { ROUTES } from '@/lib/constants';
import styles from './page.module.css';

export default function VoicePage() {
  const router = useRouter();
  const { messages, sendMessage } = useAIChat();
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [status, setStatus] = useState('点击麦克风开始对话');

  const lastAiMessage = [...messages].reverse().find((m) => m.role === 'assistant');

  const handleMicClick = useCallback(() => {
    if (isListening) {
      setIsListening(false);
      setStatus('处理中...');
      if (recognizedText.trim()) {
        sendMessage(recognizedText.trim());
        setStatus('AI 正在思考...');
      } else {
        setStatus('点击麦克风开始对话');
      }
    } else {
      setIsListening(true);
      setRecognizedText('');
      setStatus('正在听您说话...');
      // 实际项目中这里会启动 ASR
      setTimeout(() => {
        setRecognizedText('"我想听京剧"');
      }, 2000);
    }
  }, [isListening, recognizedText, sendMessage]);

  const handleEnd = () => {
    setIsListening(false);
    setRecognizedText('');
    setStatus('点击麦克风开始对话');
    router.back();
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="智能语音助手"
        variant="detail"
        onBack={() => router.back()}
        rightAction={
          <IconButton
            variant="ghost"
            aria-label="语音设置"
            onClick={() => router.push(ROUTES.SETTINGS_ACCESSIBILITY)}
          >
            <Settings size={24} />
          </IconButton>
        }
      />

      {/* 状态 */}
      <p className={styles.statusText}>{status}</p>

      {/* 识别文字 */}
      <p className={styles.recognizedText}>{recognizedText}</p>

      {/* 麦克风球 */}
      <div className={styles.micSection}>
        <div className={styles.micWrapper}>
          <div className={styles.micRing} />
          <div className={`${styles.micRing} ${styles.micRingDelayed}`} />
          <button
            type="button"
            className={`${styles.micBall} interactive ${isListening ? styles.micBallActive : ''}`}
            onClick={handleMicClick}
            aria-label={isListening ? '停止听取' : '开始说话'}
          >
            <span className={styles.micIcon}>
              <Mic size={56} />
            </span>
          </button>
        </div>
      </div>

      {/* AI 回复 */}
      {lastAiMessage && (
        <Card variant="glass" className={styles.responseCard}>
          <div className={styles.responseLabel}>
            <span className={styles.responseIcon}>
              <Bot size={20} color="var(--accent)" />
            </span>
            AI 回复
          </div>
          <p className={styles.responseText}>{lastAiMessage.content}</p>
        </Card>
      )}

      {/* 结束对话 */}
      <Button
        variant="ghost"
        size="lg"
        fullWidth
        leftIcon={<Square size={20} />}
        className={styles.endButton}
        onClick={handleEnd}
      >
        结束对话
      </Button>
    </div>
  );
}

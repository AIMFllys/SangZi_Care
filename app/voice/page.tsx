'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAIChat } from '@/hooks/useAIChat';
import { ArrowLeft, Settings, Mic, Bot, Square } from 'lucide-react';
import styles from './page.module.css';

export default function VoicePage() {
  const router = useRouter();
  const { messages, sendMessage, isLoading: aiLoading } = useAIChat();
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
      {/* 头部 */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}><ArrowLeft size={24} /></button>
        <h1 className={styles.title}>智能语音助手</h1>
        <button className={styles.settingsBtn}><Settings size={24} /></button>
      </div>

      {/* 状态 */}
      <p className={styles.statusText}>{status}</p>

      {/* 识别文字 */}
      <p className={styles.recognizedText}>{recognizedText}</p>

      {/* 麦克风球 */}
      <div className={styles.micSection}>
        <div className={styles.micWrapper}>
          <div className={`${styles.micRing} ${styles.micRing1}`} />
          <div className={`${styles.micRing} ${styles.micRing2}`} />
          <div className={styles.floatingDots}>
            <div className={`${styles.dot} ${styles.dot1}`} />
            <div className={`${styles.dot} ${styles.dot2}`} />
            <div className={`${styles.dot} ${styles.dot3}`} />
            <div className={`${styles.dot} ${styles.dot4}`} />
          </div>
          <div
            className={`${styles.micBall} ${isListening ? styles.micBallActive : ''}`}
            onClick={handleMicClick}
            role="button"
            aria-label={isListening ? '停止听取' : '开始说话'}
          >
            <span className={styles.micIcon}><Mic size={56} color="currentColor" /></span>
          </div>
        </div>
      </div>

      {/* AI 回复 */}
      {lastAiMessage && (
        <div className={`glass-card ${styles.responseCard}`}>
          <div className={styles.responseLabel}>
            <span className={styles.responseIcon}><Bot size={20} /></span>
            AI 回复
          </div>
          <p className={styles.responseText}>{lastAiMessage.content}</p>
        </div>
      )}

      {/* 结束对话 */}
      <button className={styles.endBtn} onClick={handleEnd} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
        <Square size={20} /> 结束对话
      </button>
    </div>
  );
}

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useRadioStore, formatTime } from '@/stores/radioStore';
import type { BroadcastResponse } from '@/stores/radioStore';
import { ROUTES } from '@/lib/constants';
import styles from './page.module.css';

export default function RadioPage() {
  const router = useRouter();
  const {
    broadcasts,
    categories,
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    loading,
    error,
    fetchRecommendations,
    fetchCategories,
    play,
    pause,
    next,
    prev,
    seek,
    setCurrentTime,
    setDuration,
    recordPlayback,
  } = useRadioStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playStartRef = useRef<number>(0);

  const currentBroadcast: BroadcastResponse | null =
    broadcasts.length > 0 ? broadcasts[currentIndex] ?? null : null;

  // 初始加载
  useEffect(() => {
    fetchRecommendations();
    fetchCategories();
  }, [fetchRecommendations, fetchCategories]);

  // 音频播放控制
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentBroadcast?.audio_url) {
      // 当切换广播时更新音频源
      if (audio.src !== currentBroadcast.audio_url) {
        audio.src = currentBroadcast.audio_url;
        audio.load();
      }
      if (isPlaying) {
        audio.play().catch(() => {
          // 自动播放被阻止时静默处理
        });
        playStartRef.current = Date.now();
      } else {
        audio.pause();
      }
    }
  }, [isPlaying, currentBroadcast?.audio_url, currentBroadcast]);

  // 音频事件处理
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      // 记录播放完成
      if (currentBroadcast) {
        const playDuration = (Date.now() - playStartRef.current) / 1000;
        recordPlayback(currentBroadcast.id, playDuration, true);
      }
      // 自动播放下一条
      next();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentBroadcast, next, recordPlayback, setCurrentTime, setDuration]);

  const handlePlayPause = useCallback(() => {
    if (broadcasts.length === 0) return;
    if (isPlaying) {
      // 暂停时记录播放时长
      if (currentBroadcast) {
        const playDuration = (Date.now() - playStartRef.current) / 1000;
        recordPlayback(currentBroadcast.id, playDuration, false);
      }
      pause();
    } else {
      play(currentIndex);
    }
  }, [isPlaying, broadcasts.length, currentBroadcast, currentIndex, pause, play, recordPlayback]);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (duration <= 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const newTime = ratio * duration;
      seek(newTime);
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
    },
    [duration, seek],
  );

  const handleSelectBroadcast = useCallback(
    (index: number) => {
      // 记录当前播放
      if (isPlaying && currentBroadcast) {
        const playDuration = (Date.now() - playStartRef.current) / 1000;
        recordPlayback(currentBroadcast.id, playDuration, false);
      }
      play(index);
    },
    [isPlaying, currentBroadcast, play, recordPlayback],
  );

  const handleRetry = useCallback(() => {
    fetchRecommendations();
    fetchCategories();
  }, [fetchRecommendations, fetchCategories]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.page}>
      {/* 隐藏的音频元素 */}
      <audio ref={audioRef} preload="metadata" />

      {/* 顶部栏 */}
      <header className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => router.push(ROUTES.HOME)}
          aria-label="返回首页"
          type="button"
        >
          ←
        </button>
        <h1 className={styles.title}>📻 健康广播</h1>
      </header>

      {/* 错误状态 */}
      {error && (
        <div className={styles.errorBox}>
          <span className={styles.errorText}>{error}</span>
          <button className={styles.retryBtn} onClick={handleRetry} type="button">
            重试
          </button>
        </div>
      )}

      {/* 加载状态 */}
      {loading && !error && (
        <div className={styles.loading}>
          <span className={styles.loadingText}>加载中...</span>
        </div>
      )}

      {/* 空状态 */}
      {!loading && !error && broadcasts.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📻</span>
          <span className={styles.emptyText}>暂无推荐广播</span>
        </div>
      )}

      {/* 播放器区域 */}
      {!loading && !error && broadcasts.length > 0 && (
        <>
          {/* 当前播放信息 */}
          <section className={styles.playerSection} aria-label="当前播放">
            <div className={styles.playerCard}>
              <div className={styles.nowPlayingLabel}>正在播放</div>
              <h2 className={styles.broadcastTitle}>
                {currentBroadcast?.title ?? '未知标题'}
              </h2>
              {currentBroadcast?.category && (
                <span className={styles.broadcastCategory}>
                  {currentBroadcast.category}
                </span>
              )}
              <p className={styles.broadcastContent}>
                {currentBroadcast?.content ?? ''}
              </p>
            </div>
          </section>

          {/* 进度条 */}
          <section className={styles.progressSection} aria-label="播放进度">
            <div
              className={styles.progressBar}
              onClick={handleProgressClick}
              role="progressbar"
              aria-valuenow={Math.round(currentTime)}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration)}
              aria-label="播放进度"
            >
              <div
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className={styles.timeDisplay}>
              <span className={styles.timeText}>{formatTime(currentTime)}</span>
              <span className={styles.timeText}>{formatTime(duration)}</span>
            </div>
          </section>

          {/* 播放控制 */}
          <div className={styles.controls}>
            <button
              className={styles.controlBtn}
              onClick={prev}
              aria-label="上一条"
              type="button"
            >
              ⏮
            </button>
            <button
              className={`${styles.controlBtn} ${styles.playBtn}`}
              onClick={handlePlayPause}
              aria-label={isPlaying ? '暂停' : '播放'}
              type="button"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              className={styles.controlBtn}
              onClick={next}
              aria-label="下一条"
              type="button"
            >
              ⏭
            </button>
          </div>

          {/* 分类标签 */}
          {categories.length > 0 && (
            <section className={styles.categorySection} aria-label="广播分类">
              <div className={styles.categoryTabs}>
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    className={`${styles.categoryTab} ${
                      currentBroadcast?.category === cat.name
                        ? styles.categoryTabActive
                        : ''
                    }`}
                    type="button"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 推荐收听列表 */}
          <section className={styles.listSection} aria-label="推荐收听">
            <h3 className={styles.listTitle}>📋 推荐收听</h3>
            <div className={styles.listCard}>
              {broadcasts.map((broadcast, index) => (
                <div
                  key={broadcast.id}
                  className={`${styles.listItem} ${
                    index === currentIndex ? styles.listItemActive : ''
                  }`}
                  onClick={() => handleSelectBroadcast(index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSelectBroadcast(index);
                    }
                  }}
                >
                  <span className={styles.listItemIndex}>{index + 1}</span>
                  <div className={styles.listItemInfo}>
                    <div className={styles.listItemTitle}>{broadcast.title}</div>
                    <div className={styles.listItemMeta}>{broadcast.category}</div>
                  </div>
                  {broadcast.audio_duration != null && (
                    <span className={styles.listItemDuration}>
                      {formatTime(broadcast.audio_duration)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

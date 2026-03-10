'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useRadioStore } from '@/stores/radioStore';
import DataStateWrapper from '@/components/ui/DataStateWrapper';
import styles from './page.module.css';

const CATEGORIES = [
  { name: '京剧名段', icon: '🎭', color: styles.catOrange },
  { name: '养生常识', icon: '📈', color: styles.catGreen },
  { name: '每日新闻', icon: '📰', color: styles.catBlue },
  { name: '评书大全', icon: '📖', color: styles.catPurple },
];

export default function RadioPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const broadcasts = useRadioStore((s) => s.broadcasts);
  const loading = useRadioStore((s) => s.loading);
  const error = useRadioStore((s) => s.error);
  const currentIndex = useRadioStore((s) => s.currentIndex);
  const isPlaying = useRadioStore((s) => s.isPlaying);
  const fetchRecommendations = useRadioStore((s) => s.fetchRecommendations);

  const currentBroadcast = broadcasts[currentIndex] ?? null;

  useEffect(() => {
    if (user?.id) {
      fetchRecommendations();
    }
  }, [user?.id, fetchRecommendations]);

  return (
    <div className={styles.page}>
      {/* 头部 */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>←</button>
        <h1 className={styles.title}>健康广播</h1>
        <div style={{ width: 40 }} />
      </div>

      {/* 搜索栏 */}
      <div className={`glass-card ${styles.searchBar}`}>
        <span className={styles.searchIcon}>🎙️</span>
        <input
          className={styles.searchInput}
          placeholder="按住 说话 搜索内容..."
          readOnly
        />
        <button className={styles.searchBtn}>🔍</button>
      </div>
      <p className={styles.searchHint}>点击麦克风图标开始说话</p>

      {/* 热门分类 */}
      <div style={{ marginTop: 'var(--space-xl)' }}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.sectionAccent} />
          热门分类
        </h2>
        <div className={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <div key={cat.name} className={`glass-card ${styles.categoryCard} interactive`}>
              <div className={`${styles.categoryIcon} ${cat.color}`}>{cat.icon}</div>
              <span className={styles.categoryName}>{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 为您推荐 */}
      <h2 className={styles.sectionTitle}>
        <span className={styles.sectionAccent} />
        为您推荐
      </h2>

      <DataStateWrapper
        loading={loading}
        error={error}
        empty={broadcasts.length === 0 ? { icon: '📻', title: '暂无推荐', description: '稍后再来看看吧' } : false}
        onRetry={() => fetchRecommendations()}
      >
        <div className={styles.recommendList}>
          {broadcasts.map((item, i) => (
            <div key={item.id} className={`glass-card ${styles.recommendItem} interactive`}>
              <div className={styles.recommendIcon}>🎵</div>
              <div className={styles.recommendInfo}>
                <div className={styles.recommendTitle}>{item.title}</div>
                <div className={styles.recommendMeta}>
                  {item.category} · {item.audio_duration ? `${Math.round(item.audio_duration / 60)}分钟` : '15分钟'}
                </div>
              </div>
              <button className={styles.playBtn}>▶</button>
            </div>
          ))}
        </div>
      </DataStateWrapper>

      {/* 底部播放器 */}
      {currentBroadcast && isPlaying && (
        <div className={`glass-card ${styles.player}`}>
          <span>🎵</span>
          <span className={styles.playerTitle}>{currentBroadcast.title}</span>
          <button className={styles.playerBtn}>{isPlaying ? '⏸' : '▶'}</button>
        </div>
      )}
    </div>
  );
}

'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useRadioStore } from '@/stores/radioStore';
import DataStateWrapper from '@/components/ui/DataStateWrapper';
import {
  ArrowLeft,
  Drama,
  HeartPulse,
  Newspaper,
  BookOpen,
  Radio as RadioIcon,
  Music,
  Play,
  Pause,
  Search,
} from 'lucide-react';
import styles from './page.module.css';

const CATEGORIES = [
  { name: '京剧名段', icon: <Drama size={22} />, color: styles.catOrange },
  { name: '养生常识', icon: <HeartPulse size={22} />, color: styles.catGreen },
  { name: '每日新闻', icon: <Newspaper size={22} />, color: styles.catBlue },
  { name: '评书大全', icon: <BookOpen size={22} />, color: styles.catPurple },
] as const;

export default function RadioPage() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const broadcasts = useRadioStore((state) => state.broadcasts);
  const loading = useRadioStore((state) => state.loading);
  const error = useRadioStore((state) => state.error);
  const currentIndex = useRadioStore((state) => state.currentIndex);
  const isPlaying = useRadioStore((state) => state.isPlaying);
  const fetchRecommendations = useRadioStore((state) => state.fetchRecommendations);
  const play = useRadioStore((state) => state.play);
  const pause = useRadioStore((state) => state.pause);
  const reset = useRadioStore((state) => state.reset);

  const [searchDraft, setSearchDraft] = useState('');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const currentBroadcast = broadcasts[currentIndex] ?? null;
  const filteredBroadcasts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('zh-CN');
    if (!normalized) return broadcasts.map((broadcast, index) => ({ broadcast, index }));
    return broadcasts
      .map((broadcast, index) => ({ broadcast, index }))
      .filter(({ broadcast }) =>
        [broadcast.title, broadcast.category, broadcast.content]
          .join(' ')
          .toLocaleLowerCase('zh-CN')
          .includes(normalized),
      );
  }, [broadcasts, query]);

  useEffect(() => {
    if (user?.id) void fetchRecommendations();
    return () => reset();
  }, [user?.id, fetchRecommendations, reset]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setQuery(searchDraft.trim());
  }

  function handleCategory(name: string) {
    setSelectedCategory((current) => (current === name ? null : name));
    setSearchDraft(name);
    setQuery(name);
    void fetchRecommendations();
  }

  function togglePlayback(index: number) {
    if (currentIndex === index && isPlaying) pause();
    else play(index);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backBtn} onClick={() => router.back()} aria-label="返回首页">
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.title}>健康广播</h1>
        <span className={styles.headerSpacer} aria-hidden="true" />
      </header>

      <div className={styles.scroller}>
        <form className={styles.searchBar} role="search" onSubmit={handleSearch}>
          <Search size={20} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={styles.searchInput}
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            aria-label="搜索广播"
            placeholder="搜索节目或主题"
          />
          <button type="submit" className={styles.searchBtn} aria-label="搜索广播">
            搜索
          </button>
        </form>

        <section className={styles.section} aria-labelledby="radio-categories-title">
          <h2 id="radio-categories-title" className={styles.sectionTitle}>热门分类</h2>
          <div className={styles.categoryGrid}>
            {CATEGORIES.map((category) => (
              <button
                key={category.name}
                type="button"
                className={`${styles.categoryCard} ${selectedCategory === category.name ? styles.categoryActive : ''}`}
                aria-pressed={selectedCategory === category.name}
                onClick={() => handleCategory(category.name)}
              >
                <span className={`${styles.categoryIcon} ${category.color}`} aria-hidden="true">
                  {category.icon}
                </span>
                <span className={styles.categoryName}>{category.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="radio-recommendations-title">
          <h2 id="radio-recommendations-title" className={styles.sectionTitle}>
            {query ? `“${query}”的结果` : '为您推荐'}
          </h2>
          {error && broadcasts.length > 0 && (
            <p className={styles.playbackError} role="alert">{error}</p>
          )}
          <DataStateWrapper
            loading={loading}
            error={broadcasts.length === 0 ? error : null}
            empty={filteredBroadcasts.length === 0 ? {
              icon: <RadioIcon size={44} />,
              title: query ? '没有找到相关节目' : '暂无推荐',
              description: query ? '换个关键词试试吧' : '稍后再来看看吧',
            } : false}
            onRetry={() => fetchRecommendations()}
          >
            <div className={styles.recommendList}>
              {filteredBroadcasts.map(({ broadcast, index }) => {
                const playing = currentIndex === index && isPlaying;
                return (
                  <article key={broadcast.id} className={styles.recommendItem}>
                    <span className={styles.recommendIcon} aria-hidden="true">
                      <Music size={22} />
                    </span>
                    <div className={styles.recommendInfo}>
                      <h3 className={styles.recommendTitle}>{broadcast.title}</h3>
                      <p className={styles.recommendMeta}>
                        {broadcast.category} · {broadcast.audio_duration ? `${Math.max(1, Math.round(broadcast.audio_duration / 60))}分钟` : '时长待定'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.playBtn}
                      aria-label={broadcast.audio_url
                        ? `${playing ? '暂停' : '播放'}${broadcast.title}`
                        : `${broadcast.title}暂无可播放音频`}
                      disabled={!broadcast.audio_url}
                      onClick={() => togglePlayback(index)}
                    >
                      {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                    </button>
                  </article>
                );
              })}
            </div>
          </DataStateWrapper>
        </section>
      </div>

      {currentBroadcast && isPlaying && (
        <div className={styles.player} aria-label="当前播放">
          <Music size={20} aria-hidden="true" />
          <span className={styles.playerTitle}>{currentBroadcast.title}</span>
          <button
            type="button"
            className={styles.playerBtn}
            aria-label={isPlaying ? '暂停' : '播放'}
            onClick={() => (isPlaying ? pause() : play(currentIndex))}
          >
            {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </button>
        </div>
      )}
    </div>
  );
}

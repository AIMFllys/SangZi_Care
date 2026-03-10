'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { useFamilyStore, type FamilyBindWithUser } from '@/stores/familyStore';
import { jsBridge } from '@/lib/jsbridge';
import { ROUTES } from '@/lib/constants';

// ---- 内部常量 ----
const SWIPE_THRESHOLD = 50;

// ---- 工具函数 ----
function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (Number.isNaN(diffMs) || diffMs < 0) return '刚刚';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;

  return new Date(isoString).toLocaleDateString('zh-CN');
}

// ---- 子组件：老年人端家属卡片 ----

interface ElderFamilyCardProps {
  bind: FamilyBindWithUser;
  onCall: (phone: string) => void;
}

function ElderFamilyCard({ bind, onCall }: ElderFamilyCardProps) {
  const { user, bind: bindData } = bind;
  const initial = user.name?.charAt(0) ?? '?';

  const lastContact = user.last_active_at
    ? formatRelativeTime(user.last_active_at)
    : '暂无联系';

  return (
    <div className="bg-white rounded-[28px] p-8 shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col gap-8 w-full mr-4 flex-shrink-0 snap-center" role="group" aria-label={`家属 ${user.name}`}>
      <div className="flex items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-[#FFF3E8] overflow-hidden flex items-center justify-center flex-shrink-0" aria-hidden="true">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-bold text-[var(--color-primary)]">{initial}</span>
          )}
        </div>
        <div className="flex flex-col">
          <div className="text-4xl font-bold text-[var(--color-text)]">{user.name}</div>
          <div className="text-2xl text-[var(--color-text-secondary)] mt-1">{bindData.relation}</div>
        </div>
      </div>

      <div className="bg-[#FFF9F2] rounded-[20px] p-5 flex items-center justify-between">
        <span className="text-xl text-[var(--color-text-secondary)]">最近联系：</span>
        <span className="text-2xl font-bold text-[var(--color-text)]">{lastContact}</span>
      </div>

      <div className="flex w-full">
        <button
          className="w-full interactive bg-[var(--color-primary)] text-white text-3xl font-bold py-6 rounded-[28px] flex items-center justify-center gap-3 shadow-[0_8px_20px_rgba(255,143,68,0.25)] active:scale-[0.98] transition-transform"
          onClick={() => onCall(user.phone || '')}
          aria-label={`打电话给${user.name}`}
        >
          <span>📞</span> 打电话
        </button>
      </div>
    </div>
  );
}

// ---- 子组件：家属端老人卡片 ----

interface FamilyElderCardProps {
  bind: FamilyBindWithUser;
  onCall: (phone: string) => void;
  onDetail: (userId: string) => void;
}

function FamilyElderCard({ bind, onCall, onDetail }: FamilyElderCardProps) {
  const { user, bind: bindData } = bind;
  const initial = user.name?.charAt(0) ?? '?';
  const { healthSummaries } = useFamilyStore();
  const summary = healthSummaries[user.id];

  const medText = summary?.medicationStatus
    ? `${summary.medicationStatus.completed}/${summary.medicationStatus.total}`
    : '--';

  const bpText = summary?.latestBloodPressure
    ? `${summary.latestBloodPressure.systolic}/${summary.latestBloodPressure.diastolic} mmHg`
    : '--';

  return (
    <div className="bg-white rounded-[28px] p-6 shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex flex-col gap-6 w-[85vw] max-w-[400px] mr-4 flex-shrink-0 snap-center" role="group" aria-label={`老人 ${user.name}`}>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-[#FFF3E8] overflow-hidden flex items-center justify-center flex-shrink-0" aria-hidden="true">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-[var(--color-primary)]">{initial}</span>
          )}
        </div>
        <div className="flex flex-col">
          <div className="text-2xl font-bold text-[var(--color-text)]">{user.name}</div>
          <div className="text-lg text-[var(--color-text-secondary)]">{bindData.relation}</div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="bg-[#FFF9F2] rounded-xl p-4 flex items-center justify-between">
          <span className="text-[var(--color-text-secondary)]">今日用药：</span>
          <span className="text-lg font-bold text-[var(--color-text)]">{medText}</span>
        </div>
        <div className="bg-[#FFF9F2] rounded-xl p-4 flex items-center justify-between">
          <span className="text-[var(--color-text-secondary)]">最近血压：</span>
          <span className="text-lg font-bold text-[var(--color-text)]">{bpText}</span>
        </div>
      </div>

      <div className="flex gap-3 mt-auto">
        <button
          className="interactive flex-1 bg-[var(--color-primary)] text-white font-bold py-4 rounded-[20px] flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(255,143,68,0.25)]"
          onClick={() => onCall(user.phone || '')}
          aria-label={`打电话给${user.name}`}
        >
          <span>📞</span> 打电话
        </button>
        <button
          className="interactive flex-1 bg-[#FFF3E8] text-[var(--color-text)] font-bold py-4 rounded-[20px] flex items-center justify-center gap-2"
          onClick={() => onDetail(user.id)}
          aria-label={`查看${user.name}的详细信息`}
        >
          <span>📋</span> 查看
        </button>
      </div>
    </div>
  );
}


// ---- 子组件：添加家属引导卡片 ----

interface GuideCardProps {
  isElder: boolean;
  onNavigate: () => void;
}

function GuideCard({ isElder, onNavigate }: GuideCardProps) {
  return (
    <div
      className="interactive bg-white/50 backdrop-blur-xl border-2 border-dashed border-[var(--color-primary-light)] rounded-[28px] p-10 flex flex-col items-center justify-center text-center gap-4 w-full h-[300px] flex-shrink-0 snap-center cursor-pointer"
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate();
        }
      }}
      aria-label={isElder ? '添加家属' : '绑定老人'}
    >
      <div className="w-20 h-20 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center text-4xl mb-2" aria-hidden="true">
        ➕
      </div>
      <span className="text-3xl font-bold text-[var(--color-text)]">
        {isElder ? '添加家属' : '绑定老人'}
      </span>
      <span className="text-xl text-[var(--color-text-secondary)] px-4">
        {isElder
          ? '绑定家属后，他们可以关注您的健康'
          : '绑定老人后，您可以查看他们的健康状况'}
      </span>
    </div>
  );
}

// ---- 主组件 ----

export function FamilyCarousel() {
  const router = useRouter();
  const isElder = useUserStore((s) => s.isElder);
  const binds = useFamilyStore((s) => s.binds);

  const [currentIndex, setCurrentIndex] = useState(0);

  // 触摸滑动状态
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const isDragging = useRef(false);

  const activeBinds = binds.filter((b) => b.bind.status === 'active');
  const hasBinds = activeBinds.length > 0;
  const totalSlides = hasBinds ? activeBinds.length : 1;

  // ---- 滑动处理 ----

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, totalSlides - 1));
      setCurrentIndex(clamped);
    },
    [totalSlides],
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (touchDeltaX.current < -SWIPE_THRESHOLD) {
      goTo(currentIndex + 1);
    } else if (touchDeltaX.current > SWIPE_THRESHOLD) {
      goTo(currentIndex - 1);
    }
    touchDeltaX.current = 0;
  }, [currentIndex, goTo]);

  // ---- 操作回调 ----

  const handleCall = useCallback((phone: string) => {
    jsBridge.makePhoneCall(phone);
  }, []);

  const handleDetail = useCallback(
    (userId: string) => {
      router.push(ROUTES.FAMILY_DETAIL(userId));
    },
    [router],
  );

  const handleNavigateToBind = useCallback(() => {
    router.push(ROUTES.SETTINGS_BIND);
  }, [router]);

  // ---- 渲染 ----

  return (
    <section
      className="w-full overflow-hidden relative"
      aria-label="家属卡片轮播"
      aria-roledescription="carousel"
    >
      <div
        className="flex transition-transform duration-500 ease-out px-6"
        style={{ transform: `translateX(calc(-${currentIndex * 100}% - ${currentIndex * 16}px))` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        aria-live="polite"
      >
        {hasBinds ? (
          activeBinds.map((bind, idx) => (
            <div
              key={bind.bind.id}
              className="w-full flex-shrink-0 flex items-center justify-center p-2"
              role="group"
              aria-roledescription="slide"
              aria-label={`第 ${idx + 1} 张，共 ${totalSlides} 张`}
            >
              {isElder ? (
                <ElderFamilyCard bind={bind} onCall={handleCall} />
              ) : (
                <FamilyElderCard
                  bind={bind}
                  onCall={handleCall}
                  onDetail={handleDetail}
                />
              )}
            </div>
          ))
        ) : (
          <div
            className="w-full flex-shrink-0 flex items-center justify-center p-2"
            role="group"
            aria-roledescription="slide"
            aria-label="添加家属引导"
          >
            <GuideCard isElder={isElder} onNavigate={handleNavigateToBind} />
          </div>
        )}
      </div>

      {/* 分页指示器 */}
      {totalSlides > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4" role="tablist" aria-label="轮播分页">
          {Array.from({ length: totalSlides }, (_, i) => (
            <button
              key={i}
              className={`h-3 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-10 bg-[var(--color-primary)]' : 'w-3 bg-black/15'}`}
              role="tab"
              aria-selected={i === currentIndex}
              aria-label={`第 ${i + 1} 页`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

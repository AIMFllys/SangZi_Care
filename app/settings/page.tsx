'use client';

import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';
import { User, Link as LinkIcon, Accessibility, Bell, Info, ChevronRight } from 'lucide-react';
import styles from './page.module.css';

const SETTING_ITEMS = [
  { label: '个人信息', icon: <User size={20} />, color: styles.iconBlue, href: '/settings/profile' },
  { label: '绑定管理', icon: <LinkIcon size={20} />, color: styles.iconOrange, href: '/settings/bind' },
  { label: '无障碍设置', icon: <Accessibility size={20} />, color: styles.iconGreen, href: '/settings/accessibility' },
  { label: '消息通知', icon: <Bell size={20} />, color: styles.iconPurple, href: '' },
  { label: '关于我们', icon: <Info size={20} />, color: styles.iconBlue, href: '' },
];

export default function SettingsPage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>我的</h1>
      </div>

      {/* 用户卡片 */}
      <div
        className={`glass-card ${styles.userCard} interactive`}
        onClick={() => router.push('/settings/profile')}
      >
        <div className={styles.userAvatar}><User size={32} /></div>
        <div>
          <div className={styles.userName}>{user?.name || '用户'}</div>
          <div className={styles.userRole}>{user?.role === 'elder' ? '老年人端' : '家属端'}</div>
        </div>
      </div>

      {/* 设置列表 */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>功能设置</div>
        <div className={`glass-card-solid ${styles.settingsList}`}>
          {SETTING_ITEMS.map((item) => (
            <div
              key={item.label}
              className={styles.settingItem}
              onClick={() => item.href && router.push(item.href)}
            >
              <div className={`${styles.settingIcon} ${item.color}`}>{item.icon}</div>
              <span className={styles.settingLabel}>{item.label}</span>
              <span className={styles.settingArrow}><ChevronRight size={20} /></span>
            </div>
          ))}
        </div>
      </div>

      {/* 退出登录 */}
      <button className={styles.logoutBtn} onClick={handleLogout}>
        退出登录
      </button>

      <p className={styles.version}>桑梓智护 v0.1.0</p>
    </div>
  );
}

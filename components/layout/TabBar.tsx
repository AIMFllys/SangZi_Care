'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/stores/userStore';
import styles from './TabBar.module.css';

interface TabItem {
    key: string;
    label: string;
    icon: string;
    href: string;
    center?: boolean;
}

const ELDER_TABS: TabItem[] = [
    { key: 'home', label: '语音', icon: '🎙️', href: '/' },
    { key: 'family', label: '亲属', icon: '👨‍👩‍👧', href: '/messages' },
    { key: 'menu', label: '功能', icon: '⊞', href: '/medicine', center: true },
    { key: 'health', label: '看板', icon: '❤️', href: '/health' },
    { key: 'profile', label: '我的', icon: '👤', href: '/settings' },
];

const FAMILY_TABS: TabItem[] = [
    { key: 'dashboard', label: '看板', icon: '📊', href: '/' },
    { key: 'message', label: '消息', icon: '💬', href: '/messages' },
    { key: 'voice', label: '语音', icon: '🎙️', href: '/voice', center: true },
    { key: 'health', label: '健康', icon: '📈', href: '/health' },
    { key: 'settings', label: '设置', icon: '⚙️', href: '/settings' },
];

/** 需要隐藏 TabBar 的页面 */
const HIDDEN_PATHS = ['/login', '/onboarding', '/voice'];

export default function TabBar() {
    const pathname = usePathname();
    const user = useUserStore((s) => s.user);

    const shouldHide = HIDDEN_PATHS.some((p) => pathname.startsWith(p)) || !user;
    if (shouldHide) return null;

    const isElder = user.role === 'elder';
    const tabs = isElder ? ELDER_TABS : FAMILY_TABS;

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    return (
        <nav className={styles.tabBar} role="navigation" aria-label="主导航">
            {tabs.map((tab) => (
                <Link
                    key={tab.key}
                    href={tab.href}
                    className={`${styles.tabItem} ${isActive(tab.href) ? styles.tabActive : ''} ${tab.center ? styles.tabCenter : ''}`}
                >
                    {tab.center ? (
                        <>
                            <span className={styles.tabCenterButton}>{tab.icon}</span>
                            <span className={styles.tabCenterLabel}>{tab.label}</span>
                        </>
                    ) : (
                        <>
                            <span className={styles.tabIcon}>{tab.icon}</span>
                            <span className={styles.tabLabel}>{tab.label}</span>
                        </>
                    )}
                </Link>
            ))}
        </nav>
    );
}

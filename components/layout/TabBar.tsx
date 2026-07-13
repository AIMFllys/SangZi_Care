'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/stores/userStore';
import {
  Mic,
  Users,
  LayoutGrid,
  Heart,
  User,
  LayoutDashboard,
  MessageCircle,
  Activity,
  Settings,
} from 'lucide-react';
import styles from './TabBar.module.css';

interface TabItem {
  key: string;
  label: string;
  icon: ReactNode;
  href: string;
}

type TabRole = 'elder' | 'family';

const ROUTE_TAB_OWNERS: Record<
  TabRole,
  ReadonlyArray<{ route: string; tabKey: string }>
> = {
  elder: [{ route: '/radio', tabKey: 'menu' }],
  family: [
    { route: '/radio', tabKey: 'voice' },
    { route: '/medicine', tabKey: 'health' },
  ],
};

const ICON_SIZE = 24;

const ELDER_TABS: TabItem[] = [
  { key: 'home', label: '语音', icon: <Mic size={ICON_SIZE} />, href: '/' },
  { key: 'family', label: '亲属', icon: <Users size={ICON_SIZE} />, href: '/messages' },
  {
    key: 'menu',
    label: '功能',
    icon: <LayoutGrid size={ICON_SIZE} />,
    href: '/medicine',
  },
  { key: 'health', label: '看板', icon: <Heart size={ICON_SIZE} />, href: '/health' },
  { key: 'profile', label: '我的', icon: <User size={ICON_SIZE} />, href: '/settings' },
];

const FAMILY_TABS: TabItem[] = [
  { key: 'dashboard', label: '看板', icon: <LayoutDashboard size={ICON_SIZE} />, href: '/' },
  { key: 'message', label: '消息', icon: <MessageCircle size={ICON_SIZE} />, href: '/messages' },
  {
    key: 'voice',
    label: '语音',
    icon: <Mic size={ICON_SIZE} />,
    href: '/voice',
  },
  { key: 'health', label: '健康', icon: <Activity size={ICON_SIZE} />, href: '/health' },
  { key: 'settings', label: '设置', icon: <Settings size={ICON_SIZE} />, href: '/settings' },
];

export function TAB_ITEMS(role: TabRole): TabItem[] {
  return role === 'elder' ? ELDER_TABS : FAMILY_TABS;
}

function belongsToRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function getActiveTabKey(
  pathname: string,
  role: TabRole,
  tabs: TabItem[],
): string {
  const ownedRoute = ROUTE_TAB_OWNERS[role].find(({ route }) =>
    belongsToRoute(pathname, route),
  );
  if (ownedRoute) return ownedRoute.tabKey;

  const directMatch = tabs.find(({ href }) =>
    href === '/' ? pathname === '/' : belongsToRoute(pathname, href),
  );
  return directMatch?.key ?? tabs[0].key;
}

export default function TabBar() {
  const pathname = usePathname();
  const user = useUserStore((s) => s.user);

  if (!user) return null;

  const role = user.role === 'elder' ? 'elder' : 'family';
  const tabs = TAB_ITEMS(role);
  const activeTabKey = getActiveTabKey(pathname, role, tabs);

  return (
    <nav className={styles.tabBar} role="navigation" aria-label="主导航">
      {tabs.map((tab) => {
        const active = tab.key === activeTabKey;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`${styles.tabItem} ${active ? styles.tabActive : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <span className={styles.tabIcon} aria-hidden="true">{tab.icon}</span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

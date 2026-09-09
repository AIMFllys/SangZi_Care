'use client';

import dynamic from 'next/dynamic';
import { useUserStore } from '@/stores/userStore';
import { DashboardSkeleton, ListSkeleton } from '@/components/ui/Skeleton';

const ElderHomeView = dynamic(() => import('@/components/home/ElderHomeView'), {
  loading: () => <ListSkeleton rows={3} />,
});
const FamilyHomeView = dynamic(() => import('@/components/home/FamilyHomeView'), {
  loading: () => <DashboardSkeleton />,
});

/**
 * 主页面入口 — 根据用户角色渲染不同视图
 * 路由守卫由 AuthGuard (ClientShell → AuthProvider → useAuth) 统一管理
 */
export default function HomePage() {
  const user = useUserStore((s) => s.user);

  if (!user) return null;

  return user.role === 'family' ? <FamilyHomeView /> : <ElderHomeView />;
}

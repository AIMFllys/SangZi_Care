'use client';

import { useUserStore } from '@/stores/userStore';
import ElderHomeView from '@/components/home/ElderHomeView';
import FamilyHomeView from '@/components/home/FamilyHomeView';

/**
 * 主页面入口 — 根据用户角色渲染不同视图
 * 路由守卫由 AuthGuard (ClientShell → AuthProvider → useAuth) 统一管理
 */
export default function HomePage() {
  const user = useUserStore((s) => s.user);

  if (!user) return null;

  return user.role === 'family' ? <FamilyHomeView /> : <ElderHomeView />;
}

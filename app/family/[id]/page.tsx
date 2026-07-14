// ============================================================
// 桑梓智护 — 家属/老人详情页（全栈动态服务端组件）
// ============================================================

import FamilyDetailClient from './FamilyDetailClient';

export default async function FamilyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FamilyDetailClient userId={id} />;
}

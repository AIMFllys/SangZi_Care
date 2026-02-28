// ============================================================
// 桑梓智护 — 家属/老人详情页（服务端组件 + 静态导出）
// ============================================================

import FamilyDetailClient from './FamilyDetailClient';

/** 静态导出必须提供 generateStaticParams */
export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default async function FamilyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FamilyDetailClient userId={id} />;
}

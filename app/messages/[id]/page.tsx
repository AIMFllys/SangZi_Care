// ============================================================
// 桑梓智护 — 聊天详情页（服务端入口）
// Server Component wrapper for static export with generateStaticParams
// ============================================================

import ChatDetailPage from './ChatDetail';

export function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatDetailPage />;
}

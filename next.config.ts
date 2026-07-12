import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=(self)',
  },
];

/**
 * 全栈 Next（EdgeOne Pages / Makers）。
 * - 禁止 output: 'export'（静态 out/ 方案已废弃）
 * - redirects / rewrites 请写在 edgeone.json，不要写在本文件
 * - images.unoptimized 暂保留；后续可在 EdgeOne 全栈下开启优化
 */
const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;

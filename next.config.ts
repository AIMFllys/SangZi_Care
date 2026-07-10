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

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  /**
   * 安全响应头 — 在 dev server 中生效。
   * 注意：`output: 'export'` 模式下生产环境需在
   * nginx / CDN / Android WebView 中配置这些头。
   */
  headers: async () => [
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
  ],
};

export default nextConfig;

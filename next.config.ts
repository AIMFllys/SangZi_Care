import type { NextConfig } from 'next';
import { execFileSync } from 'node:child_process';

const REVISION_PATTERN = /^[0-9a-f]{40}$/;

function resolveGitRevision(): string {
  const environmentRevision = [
    process.env.APP_GIT_REVISION,
    process.env.GITHUB_SHA,
  ].find((value) => REVISION_PATTERN.test(value?.trim() ?? ''));
  if (environmentRevision) return environmentRevision.trim().toLowerCase();

  try {
    const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().toLowerCase();
    return REVISION_PATTERN.test(revision) ? revision : 'unknown';
  } catch {
    return 'unknown';
  }
}

const appGitRevision = resolveGitRevision();
if (!REVISION_PATTERN.test(appGitRevision)) {
  throw new Error('A 40-character Git revision is required for production traceability.');
}

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
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
  turbopack: {
    root: process.cwd(),
  },
  env: {
    APP_GIT_REVISION: appGitRevision,
  },
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

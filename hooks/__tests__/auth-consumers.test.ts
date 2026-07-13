// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const AUTH_CONSUMERS = [
  'app/onboarding/page.tsx',
  'app/settings/accessibility/page.tsx',
  'app/settings/bind/page.tsx',
  'app/settings/profile/page.tsx',
];

describe('认证状态消费者', () => {
  it.each(AUTH_CONSUMERS)('%s 复用全局 AuthProvider，避免重复初始化', (path) => {
    const source = readFileSync(resolve(process.cwd(), path), 'utf8');

    expect(source).toContain("from '@/components/providers/AuthProvider'");
    expect(source).toContain('useAuthContext()');
    expect(source).not.toContain("from '@/hooks/useAuth'");
  });
});

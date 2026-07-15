import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '@/lib/constants';
import packageJson from '@/package.json';

describe('v1.1.0 version contract', () => {
  it('Web manifest、lockfile 与共享常量保持一致', () => {
    const lock = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package-lock.json'), 'utf8'),
    ) as { version?: string; packages?: Record<string, { version?: string }> };

    expect(APP_VERSION).toBe('1.1.0');
    expect(packageJson.version).toBe(APP_VERSION);
    expect(lock.version).toBe(APP_VERSION);
    expect(lock.packages?.['']?.version).toBe(APP_VERSION);
  });

  it('Android release 使用 versionCode 2 与 versionName 1.1.0', () => {
    const gradle = readFileSync(
      resolve(process.cwd(), 'android/app/build.gradle'),
      'utf8',
    );
    expect(gradle).toMatch(/versionCode\s+2\b/);
    expect(gradle).toMatch(/versionName\s+["']1\.1\.0["']/);
  });
});

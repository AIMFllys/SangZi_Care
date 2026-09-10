import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '@/lib/constants';
import packageJson from '@/package.json';

describe('v2.0.0 version contract', () => {
  it('Web manifest、lockfile 与共享常量保持一致', () => {
    const lock = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package-lock.json'), 'utf8'),
    ) as { version?: string; packages?: Record<string, { version?: string }> };

    expect(APP_VERSION).toBe('2.0.0');
    expect(packageJson.version).toBe(APP_VERSION);
    expect(lock.version).toBe(APP_VERSION);
    expect(lock.packages?.['']?.version).toBe(APP_VERSION);
  });

  it('Web 壳与原生正式包统一 versionCode 5 与 versionName 2.0.0', () => {
    const gradle = readFileSync(
      resolve(process.cwd(), 'android/app/build.gradle'),
      'utf8',
    );
    const nativeGradle = readFileSync(
      resolve(process.cwd(), '../app-kotlin/app/build.gradle.kts'),
      'utf8',
    );
    expect(gradle).toMatch(/versionCode\s+5\b/);
    expect(gradle).toMatch(/versionName\s+["']2\.0\.0["']/);
    expect(nativeGradle).toMatch(/versionCode\s*=\s*5\b/);
    expect(nativeGradle).toMatch(/versionName\s*=\s*"2\.0\.0"/);
  });
});

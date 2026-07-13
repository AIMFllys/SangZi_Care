import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..', '..');

function source(path) {
  const absolutePath = resolve(root, path);
  return existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '';
}

describe('Android 在线壳变体配置', () => {
  it('Release 只加载精确生产 HTTPS 地址', () => {
    const strings = source('android/app/src/main/res/values/strings.xml');

    expect(strings).toContain(
      '<string name="app_base_url" translatable="false">https://sangzicare.husteread.com</string>',
    );
    expect(strings).not.toContain('example.com');
  });

  it('Debug 使用 adb reverse 可达的可信 loopback 且拥有独立包名', () => {
    const strings = source('android/app/src/debug/res/values/strings.xml');
    const gradle = source('android/app/build.gradle');

    expect(strings).toContain(
      '<string name="app_base_url" translatable="false">http://127.0.0.1:7742</string>',
    );
    expect(gradle).toMatch(/debug\s*\{[\s\S]*?applicationIdSuffix\s+["']\.debug["']/);
  });

  it('Release 禁止明文、备份和强制竖屏', () => {
    const manifest = source('android/app/src/main/AndroidManifest.xml');

    expect(manifest).toContain('android:usesCleartextTraffic="false"');
    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).not.toContain('android:screenOrientation=');
    expect(manifest).not.toContain('android:networkSecurityConfig=');
  });

  it('Debug 明文例外只允许 127.0.0.1', () => {
    const manifest = source('android/app/src/debug/AndroidManifest.xml');
    const network = source(
      'android/app/src/debug/res/xml/network_security_config.xml',
    );

    expect(manifest).toContain('tools:replace="android:usesCleartextTraffic"');
    expect(manifest).not.toContain(
      'tools:replace="android:usesCleartextTraffic,android:networkSecurityConfig"',
    );
    expect(manifest).toContain('android:networkSecurityConfig="@xml/network_security_config"');
    expect(network).toContain('<base-config cleartextTrafficPermitted="false" />');
    expect(network).toContain('<domain-config cleartextTrafficPermitted="true">');
    expect(network).toContain(
      '<domain includeSubdomains="false">127.0.0.1</domain>',
    );
    const domains = [...network.matchAll(/<domain\b[^>]*>([^<]+)<\/domain>/g)]
      .map((match) => match[1].trim());
    expect(domains).toEqual(['127.0.0.1']);
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('全局动效契约', () => {
  const globals = readFileSync(resolve(process.cwd(), 'styles/globals.css'), 'utf8');
  const template = readFileSync(resolve(process.cwd(), 'app/template.tsx'), 'utf8');

  it('定义统一时长、缓动和按压缩放', () => {
    expect(globals).toContain('--duration-fast: 150ms');
    expect(globals).toContain('--duration-normal: 280ms');
    expect(globals).toContain('--press-scale: 0.97');
    expect(globals).toContain('--ease-out-smooth:');
  });

  it('页面切换只做透明度淡入', () => {
    expect(template).toContain('PageFade');
    expect(globals).toContain('.page-fade');
    expect(globals).toContain('.page-fade.is-entering');
    expect(globals).toContain('@keyframes page-fade-in');
    expect(globals).toMatch(/@keyframes page-fade-in\s*\{[^}]*opacity:\s*0/);
    expect(globals).not.toMatch(/@keyframes page-fade-in\s*\{[^}]*translateY/);
    expect(globals).not.toMatch(/page-fade-in[^;]*both/);
  });
});

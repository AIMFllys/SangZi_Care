// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Tailwind v4 内容扫描', () => {
  it('只扫描运行时界面目录，不把文档和原型带入生产 CSS', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'styles/globals.css'),
      'utf8',
    );

    expect(source).toContain('@import "tailwindcss" source(none);');
    expect(source).toContain('@source "../app";');
    expect(source).toContain('@source "../components";');
    expect(source).not.toContain('@source "../docs";');
  });
});

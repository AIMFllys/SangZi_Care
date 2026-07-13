// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('语音页样式变量', () => {
  it('错误提示使用设计系统中的危险色变量', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'app/voice/page.module.css'),
      'utf8',
    );

    expect(css).toContain('var(--color-danger)');
    expect(css).not.toContain('var(--danger)');
  });
});

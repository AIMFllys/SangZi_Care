// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(
  resolve(process.cwd(), 'app/voice/page.module.css'),
  'utf8',
);

describe('语音页样式变量', () => {
  it('错误提示使用设计系统中的危险色变量', () => {
    expect(css).toContain('var(--color-danger)');
    expect(css).not.toContain('var(--danger)');
  });

  it('限制 AI 回复卡高度并只让正文区域滚动', () => {
    const responseCard = css.match(/\.responseCard\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    const responseBody = css.match(/\.responseBody\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';

    expect(responseCard).toMatch(/display:\s*flex/);
    expect(responseCard).toMatch(/min-block-size:\s*0/);
    expect(responseCard).toMatch(/max-block-size:\s*clamp\(/);
    expect(responseCard).toMatch(/overflow:\s*hidden/);
    expect(responseBody).toMatch(/min-block-size:\s*0/);
    expect(responseBody).toMatch(/overflow-y:\s*auto/);
    expect(responseBody).toMatch(/overscroll-behavior:\s*contain/);
  });

  it('为短横屏提供更紧凑的回复卡上限并保护连续长文本', () => {
    expect(css).toMatch(
      /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*650px\)[\s\S]*?\.responseCard\s*\{[\s\S]*?max-block-size:\s*clamp\(/,
    );
    expect(css).toMatch(/\.responseBody[\s\S]*?overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.responseBody[\s\S]*?word-break:\s*break-word/);
  });
});

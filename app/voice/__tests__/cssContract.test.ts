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

  it('在短横屏为回复、动作和底部控件保留独立布局预算', () => {
    expect(css).toMatch(
      /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*650px\)[\s\S]*?\.page\s*\{[\s\S]*?grid-template-columns:/,
    );
    expect(css).toMatch(
      /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*650px\)[\s\S]*?\.responseCard\s*\{[\s\S]*?flex-shrink:\s*0/,
    );
    expect(css).toMatch(/\.responseBody[\s\S]*?flex:\s*1\s+1\s+auto/);
    expect(css).toMatch(
      /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*650px\)[\s\S]*?\.actionFeedback\s+ul\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,/,
    );
  });

  it('在竖屏动作反馈出现时收紧回复卡，避免麦克风遮挡固定标签', () => {
    expect(css).toMatch(
      /@media\s*\(orientation:\s*portrait\)[\s\S]*?\.responseCardWithActions\s*\{[\s\S]*?max-block-size:\s*clamp\(176px,\s*25dvh,\s*216px\)/,
    );
    expect(css).toMatch(
      /@media\s*\(orientation:\s*portrait\)[\s\S]*?\.pageWithActions\s+\.micBall\s*\{[\s\S]*?height:\s*clamp\(104px,\s*15\.5dvh,\s*132px\)/,
    );
  });

  it('短横屏动作反馈保留内部滚动，不裁切多行结果文案', () => {
    expect(css).toMatch(
      /@media\s*\(orientation:\s*landscape\)[\s\S]*?\.actionFeedback\s*\{[\s\S]*?overflow-y:\s*auto/,
    );
    expect(css).toMatch(
      /@media\s*\(orientation:\s*landscape\)[\s\S]*?\.actionFeedback\s*\{[\s\S]*?overflow-x:\s*hidden/,
    );
  });
});

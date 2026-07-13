import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('聊天移动端 CSS 合约', () => {
  it('语音气泡不再强制 200px 最小宽度', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'components/messages/ChatBubble.module.css'),
      'utf8',
    );

    expect(css).not.toMatch(/min-width:\s*200px/);
  });
});

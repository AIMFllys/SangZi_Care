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

  it('对话区使用稳定纯色底，日期分隔不再使用圆形胶囊高亮', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'components/messages/MessageList.module.css'),
      'utf8',
    );
    const listRule = css.match(/\.list\s*\{([^}]*)\}/)?.[1] ?? '';
    const dateTextRule = css.match(/\.dateText\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(listRule).toMatch(/background:\s*var\(--bg-base\)/);
    expect(listRule).not.toMatch(/(?:linear|radial)-gradient/);
    expect(dateTextRule).toMatch(/background:\s*transparent/);
    expect(dateTextRule).not.toMatch(/border-radius:\s*var\(--radius-full\)/);
  });

  it('消息气泡以颜色和边框区分，不叠加局部高亮阴影', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'components/messages/ChatBubble.module.css'),
      'utf8',
    );
    const mineRule = css.match(/\.bubbleMine\s*\{([^}]*)\}/)?.[1] ?? '';
    const otherRule = css.match(/\.bubbleOther\s*\{([^}]*)\}/)?.[1] ?? '';

    expect(mineRule).toMatch(/background:\s*var\(--accent-action\)/);
    expect(otherRule).toMatch(/border:\s*1px solid var\(--divider\)/);
    expect(mineRule).not.toMatch(/box-shadow/);
    expect(otherRule).not.toMatch(/box-shadow/);
  });
});

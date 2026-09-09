import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageFade } from '../PageFade';

describe('PageFade', () => {
  it('进入时带 is-entering，动画结束回调会拆掉合成层', () => {
    render(
      <PageFade>
        <p>内容</p>
      </PageFade>,
    );
    expect(document.querySelector('.page-fade')?.className).toContain('is-entering');

    const source = readFileSync(resolve(process.cwd(), 'components/layout/PageFade.tsx'), 'utf8');
    expect(source).toContain('onAnimationEnd');
    expect(source).toContain('setEntering(false)');
  });
});

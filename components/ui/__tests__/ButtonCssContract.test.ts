import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Button CSS contract', () => {
  it('统一使用 44/48/52px 三档正常高度', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'components/ui/Button.module.css'),
      'utf8',
    );
    const baseRule = css.match(/\.button\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    const smallRule = css.match(/\.sm\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    const largeRule = css.match(/\.lg\s*\{([\s\S]*?)\}/)?.[1] ?? '';

    expect(baseRule).toContain('min-height: 48px');
    expect(smallRule).toContain('min-height: 44px');
    expect(largeRule).toContain('min-height: 52px');
    expect(css).not.toContain('min-height: 56px');
  });

  it('运行时非圆形紧凑按钮仍保持至少 44px 触控高度', () => {
    const homeCss = readFileSync(
      resolve(process.cwd(), 'app/page.module.css'),
      'utf8',
    );
    const medicineCss = readFileSync(
      resolve(process.cwd(), 'app/medicine/page.module.css'),
      'utf8',
    );
    const dashboardManageRule =
      homeCss.match(/\.chartHeader\s+button\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    const addPlanRule =
      medicineCss.match(/\.dateNav\s*>\s*button\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    const confirmMedicationRule =
      medicineCss.match(/\.timeSlotStatus\s+button\s*\{([\s\S]*?)\}/)?.[1] ?? '';

    expect(dashboardManageRule).toContain('min-height: 44px');
    expect(addPlanRule).toContain('min-height: 44px');
    expect(confirmMedicationRule).toContain('min-height: 44px');
  });
});

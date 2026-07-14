import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('登录页窄屏布局合约', () => {
  const page = readFileSync(resolve(process.cwd(), 'app/login/page.tsx'), 'utf8');
  const css = readFileSync(
    resolve(process.cwd(), 'app/login/login.module.css'),
    'utf8',
  );

  it('在 350px 以下使用紧凑发送文案但保留完整无障碍名称', () => {
    expect(page).toContain('compactSendCodeLabel');
    expect(page).toContain('aria-label={sendCodeLabel}');
    expect(page).toContain('styles.sendCodeLabelFull');
    expect(page).toContain('styles.sendCodeLabelCompact');
    expect(css).toMatch(/@media\s*\(max-width:\s*350px\)/);
    expect(css).toMatch(/\.sendCodeLabelCompact\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(
      /@media\s*\(max-width:\s*350px\)[\s\S]*\.sendCodeLabelFull\s*\{[^}]*display:\s*none/,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*350px\)[\s\S]*\.sendCodeLabelCompact\s*\{[^}]*display:\s*inline/,
    );
  });

  it('登录成功后整页导航，确保根级认证上下文重新读取新会话', () => {
    expect(page).toMatch(
      /replaceDocument\(res\.is_new_user \? '\/onboarding' : '\/'\)/,
    );
    expect(page).not.toContain("router.push('/onboarding')");
    expect(page).not.toContain("router.push('/')");
  });
});

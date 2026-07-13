import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendVerificationEmail } from '@/lib/server/email';

describe('sendVerificationEmail', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('SMTP 凭据缺失时安全失败且不记录邮箱或验证码', async () => {
    vi.stubEnv('SMTP_USER', '');
    vi.stubEnv('SMTP_PASS', '');
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      sendVerificationEmail('elder@example.com', '123456'),
    ).resolves.toBe(false);

    const logs = JSON.stringify(error.mock.calls);
    expect(logs).toContain('SMTP_USER/SMTP_PASS');
    expect(logs).not.toContain('elder@example.com');
    expect(logs).not.toContain('123456');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: { createTransport: mocks.createTransport },
}));

import { sendVerificationEmail } from '@/lib/server/email';

describe('sendVerificationEmail', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function configureSmtp(user: string): void {
    vi.stubEnv('SMTP_USER', user);
    vi.stubEnv('SMTP_PASS', 'test-password');
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail });
  }

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

  it('发送成功日志不包含收件邮箱或验证码', async () => {
    configureSmtp('success-sender@example.invalid');
    mocks.sendMail.mockResolvedValueOnce({ messageId: 'test-message' });
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await expect(
      sendVerificationEmail('elder@example.com', '123456'),
    ).resolves.toBe(true);

    const logs = JSON.stringify(info.mock.calls);
    expect(logs).toContain('验证码邮件已发送');
    expect(logs).not.toContain('elder@example.com');
    expect(logs).not.toContain('123456');
  });

  it('发送失败日志不包含收件邮箱、验证码或 SMTP 异常正文', async () => {
    configureSmtp('failure-sender@example.invalid');
    mocks.sendMail.mockRejectedValueOnce(new Error('private-smtp-detail'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      sendVerificationEmail('family@example.com', '654321'),
    ).resolves.toBe(false);

    const logs = JSON.stringify(error.mock.calls);
    expect(logs).toContain('发送验证码邮件失败');
    expect(logs).not.toContain('family@example.com');
    expect(logs).not.toContain('654321');
    expect(logs).not.toContain('private-smtp-detail');
  });
});

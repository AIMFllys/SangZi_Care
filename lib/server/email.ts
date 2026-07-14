// ============================================================
// 桑梓智护 · 服务端邮件发送（SMTP）
// ------------------------------------------------------------
// 对齐 backend/services/email_service.py：通过 SMTP 发送验证码邮件。
// 使用 nodemailer（已安装）；从 SMTP_* 环境变量读取配置。
//
// SMTP 凭据缺失时安全失败，避免生产环境返回“已发送”却没有真实邮件。
// 日志不得包含收件人或验证码。
//
// 仅服务端使用；严禁客户端 import（含 SMTP_PASS）。
// ============================================================

import nodemailer, { type Transporter } from 'nodemailer';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromName: string;
}

function readSmtpConfig(): SmtpConfig | null {
  const user = process.env.SMTP_USER?.trim() ?? '';
  const pass = process.env.SMTP_PASS?.trim() ?? '';
  // 凭据缺失 → 安全失败
  if (!user || !pass) return null;
  return {
    host: process.env.SMTP_HOST?.trim() || 'smtpdm.aliyun.com',
    port: Number(process.env.SMTP_PORT ?? '465'),
    user,
    pass,
    fromName: process.env.SMTP_FROM_NAME?.trim() || 'SangZiCare',
  };
}

let _transporter: Transporter | null = null;
let _transporterKey = '';

function getTransporter(cfg: SmtpConfig): Transporter {
  // 凭据变更时重建（基本不会发生，但避免缓存错配）
  const key = `${cfg.host}:${cfg.port}:${cfg.user}`;
  if (_transporter && _transporterKey === key) return _transporter;
  _transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465, // 465 用 SSL；其余（587/80/25）用 STARTTLS 或明文
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });
  _transporterKey = key;
  return _transporter;
}

function buildHtml(code: string, expiresMinutes: number, fromName: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <div style="max-width:480px;margin:32px auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#ffffff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.04);">
    <div style="text-align:center;margin-bottom:24px;">
      <span style="font-size:40px;">🏡</span>
      <h2 style="margin:8px 0 0;color:#1a1a2e;font-size:22px;">${fromName}</h2>
    </div>
    <div style="background:#f9fafb;border:1px solid #f0f0f0;border-radius:8px;padding:24px;text-align:center;">
      <p style="color:#555;font-size:15px;margin:0 0 16px;">您的登录验证码为：</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#2e7d32;padding:12px 0;">${code}</div>
      <p style="color:#999;font-size:13px;margin:16px 0 0;">验证码 ${expiresMinutes} 分钟内有效，请勿泄露给他人。</p>
    </div>
    <p style="text-align:center;color:#bbb;font-size:12px;margin-top:20px;">如非本人操作，请忽略此邮件。</p>
  </div>
</body>
</html>`;
}

/**
 * 发送验证码邮件。
 * @param toEmail 收件人
 * @param code 6 位验证码
 * @param expiresMinutes 有效分钟（用于邮件文案）
 * @returns 是否发送成功
 */
export async function sendVerificationEmail(
  toEmail: string,
  code: string,
  expiresMinutes = 5,
): Promise<boolean> {
  const cfg = readSmtpConfig();

  // 生产安全：无 SMTP 凭据时不得伪装成发送成功，也不得打印验证码。
  if (!cfg) {
    console.error('[email] SMTP_USER/SMTP_PASS 未配置，验证码邮件未发送。');
    return false;
  }

  const subject = `【${cfg.fromName}】登录验证码`;
  const html = buildHtml(code, expiresMinutes, cfg.fromName);

  try {
    const transporter = getTransporter(cfg);
    await transporter.sendMail({
      from: `"${cfg.fromName}" <${cfg.user}>`,
      to: toEmail,
      subject,
      html,
    });
    console.info('[email] 验证码邮件已发送');
    return true;
  } catch {
    console.error('[email] 发送验证码邮件失败');
    return false;
  }
}

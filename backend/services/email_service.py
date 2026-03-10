"""阿里云邮件推送服务 — 通过 SMTP 发送验证码邮件。

支持多种连接方式，自动适配不同网络环境（含 VPN/代理场景）。
"""

import logging
import smtplib
import ssl
from email.header import Header
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from core.config import settings

logger = logging.getLogger(__name__)


def _create_ssl_context() -> ssl.SSLContext:
    """创建兼容阿里云 SMTP 的 SSL 上下文。"""
    ctx = ssl.create_default_context()
    ctx.set_ciphers("DEFAULT:@SECLEVEL=1")
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def send_verification_email(to_email: str, code: str, expires_minutes: int = 5) -> bool:
    """发送验证码邮件。

    Args:
        to_email: 收件人邮箱。
        code: 6 位验证码。
        expires_minutes: 验证码有效时间（分钟）。

    Returns:
        发送是否成功。
    """
    subject = f"【{settings.SMTP_FROM_NAME}】登录验证码"

    html_body = f"""\
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="utf-8">
    </head>
    <body style="margin:0;padding:0;background-color:#f4f5f7;">
        <div style="max-width:480px;margin:32px auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#ffffff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.04);">
            <div style="text-align:center;margin-bottom:24px;">
                <span style="font-size:40px;">🏡</span>
                <h2 style="margin:8px 0 0;color:#1a1a2e;font-size:22px;">{settings.SMTP_FROM_NAME}</h2>
            </div>
            <div style="background:#f9fafb;border:1px solid #f0f0f0;border-radius:8px;padding:24px;text-align:center;">
                <p style="color:#555;font-size:15px;margin:0 0 16px;">您的登录验证码为：</p>
                <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#2e7d32;padding:12px 0;">{code}</div>
                <p style="color:#999;font-size:13px;margin:16px 0 0;">验证码 {expires_minutes} 分钟内有效，请勿泄露给他人。</p>
            </div>
            <p style="text-align:center;color:#bbb;font-size:12px;margin-top:20px;">如非本人操作，请忽略此邮件。</p>
            <div style="text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #f0f0f0;">
                <p style="color:#555;font-size:13px;margin:0 0 4px;">@{settings.SMTP_FROM_NAME}</p>
                <p style="color:#888;font-size:12px;margin:0 0 12px;">—— By HUSTer☆Reading 羽升</p>
                <a href="https://app.elderstech.husteread.com" style="display:inline-block;color:#2e7d32;font-size:12px;text-decoration:none;border:1px solid #c8e6c9;border-radius:6px;padding:6px 16px;margin-bottom:12px;">🌿 了解应用 → app.elderstech.husteread.com</a>
            </div>
            <p style="text-align:center;color:#bbb;font-size:11px;margin-top:16px;line-height:1.6;">本邮件由华科学生个人项目发送，不代表学校官方。</p>
        </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    
    # 国际化/防乱码核心：使用 MIME Base64 编码方式对发件人名称进行编码
    encoded_name = str(Header(settings.SMTP_FROM_NAME, "utf-8"))
    msg["From"] = formataddr((encoded_name, settings.SMTP_USER))
    msg["To"] = to_email
    
    # Subject 也进行标准 Header 编码
    msg["Subject"] = Header(subject, "utf-8").encode()
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    ssl_ctx = _create_ssl_context()

    # ── 方式 1：SMTP_SSL（端口 465） ──
    # 生产环境（直连阿里云网络）首选此方式
    try:
        with smtplib.SMTP_SSL(
            settings.SMTP_HOST, settings.SMTP_PORT,
            timeout=10, context=ssl_ctx,
        ) as server:
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
        logger.info("验证码邮件已通过 SSL (端口 %s) 发送至 %s", settings.SMTP_PORT, to_email)
        return True
    except Exception as e:
        logger.warning("SSL 连接 (端口 %s) 失败: %s", settings.SMTP_PORT, e)

    # ── 方式 2：STARTTLS（端口 587） ──
    try:
        with smtplib.SMTP(settings.SMTP_HOST, 587, timeout=10) as server:
            server.ehlo()
            server.starttls(context=ssl_ctx)
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
        logger.info("验证码邮件已通过 STARTTLS (端口 587) 发送至 %s", to_email)
        return True
    except Exception as e:
        logger.warning("STARTTLS 连接 (端口 587) 失败: %s", e)

    # ── 方式 3：非加密 SMTP（端口 80，阿里云邮件推送专用端口） ──
    # 在 VPN/代理环境下 SSL 端口不可用时，此方式可作为可靠回退
    try:
        with smtplib.SMTP(settings.SMTP_HOST, 80, timeout=10) as server:
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
        logger.info("验证码邮件已通过非加密 SMTP (端口 80) 发送至 %s", to_email)
        return True
    except Exception as e:
        logger.warning("非加密 SMTP 连接 (端口 80) 失败: %s", e)

    # ── 方式 4：非加密 SMTP（端口 25，最后手段） ──
    try:
        with smtplib.SMTP(settings.SMTP_HOST, 25, timeout=10) as server:
            server.ehlo()
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
        logger.info("验证码邮件已通过非加密 SMTP (端口 25) 发送至 %s", to_email)
        return True
    except Exception:
        logger.exception("发送验证码邮件失败 (所有方式均不可用): %s", to_email)
        return False


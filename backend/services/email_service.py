"""阿里云邮件推送服务 — 通过 SMTP (SSL) 发送验证码邮件。"""

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from core.config import settings

logger = logging.getLogger(__name__)


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
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        # 尝试 SSL 连接 (端口 465)
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
        logger.info("验证码邮件已发送至 %s", to_email)
        return True
    except Exception as e:
        logger.error("SSL 连接失败，尝试 STARTTLS: %s", str(e))
        
        # 备用方案：尝试 STARTTLS (端口 25 或 587)
        try:
            with smtplib.SMTP(settings.SMTP_HOST, 25, timeout=10) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())
            logger.info("验证码邮件已通过 STARTTLS 发送至 %s", to_email)
            return True
        except Exception:
            logger.exception("发送验证码邮件失败 (所有方式): %s", to_email)
            return False

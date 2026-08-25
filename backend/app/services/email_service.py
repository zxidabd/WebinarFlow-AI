"""Outbound email — verification + password-reset links.

In development (no SMTP host configured) the email body is simply written to
the log, so the clickable verification/reset links are still visible to the
developer without an SMTP server. In production, messages are sent through
``aiosmtplib`` (imported lazily so the app still boots if the package is not
installed).
"""
from __future__ import annotations

import logging

from app.core.config import settings

log = logging.getLogger("webinarflow.email")


def _domain() -> str:
    return str(settings.FRONTEND_URL).rstrip("/")


async def send_email(to: str, subject: str, body: str) -> None:
    if not settings.SMTP_HOST and not settings.SMTP_PASSWORD.startswith("re_"):
        log.info("[dev-email] to=%s subject=%s\n%s", to, subject, body)
        return

    # 1. If Resend API key is used, send via Resend HTTPS REST API (Port 443 - never blocked by cloud firewalls)
    if settings.SMTP_PASSWORD.startswith("re_") or "resend" in str(settings.SMTP_HOST).lower():
        import httpx
        try:
            from_addr = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>" if settings.SMTP_FROM_EMAIL else f"{settings.SMTP_FROM_NAME} <onboarding@resend.dev>"
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {settings.SMTP_PASSWORD}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "from": from_addr,
                        "to": [to],
                        "subject": subject,
                        "html": body,
                    },
                )
                if res.status_code in (200, 201):
                    log.info("[resend-sent] to=%s status=%s", to, res.status_code)
                    return
                log.warning("[resend-api-notice] to=%s status=%s response=%s", to, res.status_code, res.text)
        except Exception as exc:
            log.warning("[resend-api-failed] to=%s error=%s", to, exc)

    # 2. Standard SMTP (e.g. Gmail SMTP) with short 5s timeout
    import aiosmtplib  # lazy: keeps the app bootable without aiosmtplib installed
    from email.mime.text import MIMEText

    msg = MIMEText(body, "html", "utf-8")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to
    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME or None,
            password=settings.SMTP_PASSWORD or None,
            start_tls=settings.SMTP_PORT == 587,
            use_tls=settings.SMTP_PORT == 465,
            timeout=5.0,
        )
    except Exception as exc:  # noqa: BLE001 — never break signup on an email outage.
        print(f"\n[SMTP Delivery Notice] Could not send email to {to} via {settings.SMTP_HOST}: {exc}", flush=True)
        log.warning(
            "[email-failed] to=%s subject=%s error=%s",
            to,
            subject,
            exc,
        )


async def send_verification_email(user, token: str) -> None:
    link = f"{_domain()}/verify-email?token={token}"
    name = user.full_name or "there"
    expire_hours = settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS

    print(f"\n=======================================================\n[VERIFICATION LINK] For {user.email}:\n{link}\n=======================================================\n", flush=True)
    log.info("[verification-link] to=%s link=%s", user.email, link)

    body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050505; color: #f5f5f7; margin: 0; padding: 40px 20px; }}
        .container {{ max-width: 560px; margin: 0 auto; background-color: #0d0d0f; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }}
        .logo {{ font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 24px; letter-spacing: -0.02em; }}
        .logo span {{ color: #d4d4d8; }}
        h1 {{ font-size: 24px; font-weight: 600; color: #ffffff; margin-top: 0; margin-bottom: 16px; }}
        p {{ font-size: 14px; line-height: 1.6; color: #a1a1aa; margin-bottom: 24px; }}
        .btn-container {{ text-align: center; margin: 32px 0; }}
        .btn {{ display: inline-block; background: linear-gradient(135deg, #6b6b6f 0%, #e8e8ea 25%, #f5f5f7 45%, #9a9a9e 60%, #d4d4d8 80%, #707074 100%); color: #0a0a0a; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 20px rgba(255,255,255,0.15); }}
        .link-alt {{ font-size: 12px; color: #71717a; word-break: break-all; margin-top: 24px; }}
        .link-alt a {{ color: #a1a1aa; }}
        .footer {{ font-size: 12px; color: #52525b; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; margin-top: 32px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">WebinarFlow<span>.AI</span></div>
        <h1>Verify your email address</h1>
        <p>Hi {name},</p>
        <p>Thank you for signing up for WebinarFlow.AI. To ensure the security of your account and activate your workspace, please confirm your email address by clicking the button below.</p>
        <div class="btn-container">
          <a href="{link}" class="btn" target="_blank">Verify Email</a>
        </div>
        <p class="link-alt">If the button doesn't work, copy and paste this link into your browser:<br><a href="{link}">{link}</a></p>
        <p>This verification link will expire in <strong>{expire_hours} hours</strong>. If you did not create a WebinarFlow account, please disregard this message.</p>
        <div class="footer">
          Need help? Contact us at support@webinarflow.ai.<br>
          &copy; {settings.SMTP_FROM_NAME}. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """
    await send_email(user.email, "Verify your email — WebinarFlow.AI", body)


async def send_password_reset_email(user, token: str) -> None:
    link = f"{_domain()}/reset-password?token={token}"
    name = user.full_name or "there"
    expire_hours = settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS

    body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #050505; color: #f5f5f7; margin: 0; padding: 40px 20px; }}
        .container {{ max-width: 560px; margin: 0 auto; background-color: #0d0d0f; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 40px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); }}
        .logo {{ font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 24px; letter-spacing: -0.02em; }}
        .logo span {{ color: #d4d4d8; }}
        h1 {{ font-size: 24px; font-weight: 600; color: #ffffff; margin-top: 0; margin-bottom: 16px; }}
        p {{ font-size: 14px; line-height: 1.6; color: #a1a1aa; margin-bottom: 24px; }}
        .btn-container {{ text-align: center; margin: 32px 0; }}
        .btn {{ display: inline-block; background: linear-gradient(135deg, #6b6b6f 0%, #e8e8ea 25%, #f5f5f7 45%, #9a9a9e 60%, #d4d4d8 80%, #707074 100%); color: #0a0a0a; text-decoration: none; padding: 14px 32px; border-radius: 999px; font-size: 14px; font-weight: 600; }}
        .link-alt {{ font-size: 12px; color: #71717a; word-break: break-all; margin-top: 24px; }}
        .link-alt a {{ color: #a1a1aa; }}
        .footer {{ font-size: 12px; color: #52525b; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; margin-top: 32px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">WebinarFlow<span>.AI</span></div>
        <h1>Reset your password</h1>
        <p>Hi {name},</p>
        <p>We received a request to reset your password. If you requested this change, click the button below to set a new password:</p>
        <div class="btn-container">
          <a href="{link}" class="btn" target="_blank">Reset Password</a>
        </div>
        <p class="link-alt">Or paste this link into your browser:<br><a href="{link}">{link}</a></p>
        <p>This link expires in <strong>{expire_hours} hours</strong>. If you did not request a password reset, you can safely ignore this email.</p>
        <div class="footer">
          Need help? Contact support@webinarflow.ai.<br>
          &copy; {settings.SMTP_FROM_NAME}. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """
    await send_email(user.email, "Reset your password — WebinarFlow.AI", body)


async def send_registration_confirmation_email(registrant, webinar) -> None:
    """Send confirmation email to a registered attendee."""
    name = registrant.full_name or "there"
    webinar_title = webinar.title if webinar else "Webinar"
    starts_at_str = ""
    if webinar and webinar.starts_at:
        starts_at_str = f"<p><strong>Date & Time:</strong> {webinar.starts_at.strftime('%B %d, %Y at %I:%M %p')} {webinar.timezone or 'UTC'}</p>"

    body = (
        f"<p>Hi {name},</p>"
        f"<p>Your registration for <strong>{webinar_title}</strong> is confirmed!</p>"
        f"{starts_at_str}"
        f"<p>We look forward to seeing you there.</p>"
    )
    await send_email(registrant.email, f"Registration Confirmed: {webinar_title} — WebinarFlow.AI", body)

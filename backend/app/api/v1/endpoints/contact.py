"""Public contact & support inquiry endpoint.

Allows visitors to submit queries/messages from the website. An email notification
is dispatched to the business support inbox (support@webinarflow.in) and a receipt
confirmation is sent to the sender.
"""
from __future__ import annotations

import html
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db import get_db
from app.models.user import User
from app.services.email_service import send_email

log = logging.getLogger("webinarflow.contact")

router = APIRouter()


class ContactRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    subject: str | None = Field(default=None, max_length=200)
    message: str = Field(..., min_length=5, max_length=4000)


@router.post("", status_code=status.HTTP_200_OK)
@router.post("/", status_code=status.HTTP_200_OK)
async def submit_contact_inquiry(
    payload: ContactRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Receive contact query, notify business inbox, and acknowledge the sender."""
    name_clean = payload.name.strip()
    email_clean = payload.email.strip().lower()
    subject_clean = (payload.subject or "General Support Query").strip()
    msg_clean = payload.message.strip()
    escaped_msg = html.escape(msg_clean).replace("\n", "<br>")

    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # Primary business support destination
    dest_email = (getattr(settings, "SUPPORT_EMAIL", "") or "support@webinarflow.in").strip()

    # 1. Dispatch email to Business Support Inbox
    support_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d0d0f; color: #ffffff; padding: 24px; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #6E1F32 0%, #852533 100%); padding: 24px; text-align: center; }}
            .content {{ padding: 28px; }}
            .field {{ margin-bottom: 16px; }}
            .label {{ font-size: 11px; text-transform: uppercase; color: #a1a1aa; font-weight: 700; letter-spacing: 0.05em; }}
            .val {{ font-size: 14px; color: #ffffff; margin-top: 4px; font-weight: 500; }}
            .message-box {{ background: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 18px; margin-top: 8px; font-size: 13px; line-height: 1.6; color: #e4e4e7; }}
            .footer {{ padding: 16px 28px; background: #121215; border-top: 1px solid #27272a; font-size: 11px; color: #71717a; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin:0; color:#ffffff; font-size: 20px;">New Support Inquiry</h2>
                <p style="margin:4px 0 0; color:#fbcfe8; font-size: 12px;">WebinarFlow.AI Website Contact Form</p>
            </div>
            <div class="content">
                <div class="field">
                    <div class="label">Sender Name</div>
                    <div class="val">{html.escape(name_clean)}</div>
                </div>
                <div class="field">
                    <div class="label">Sender Email</div>
                    <div class="val"><a href="mailto:{email_clean}" style="color: #f43f5e; text-decoration: none;">{email_clean}</a></div>
                </div>
                <div class="field">
                    <div class="label">Subject</div>
                    <div class="val">{html.escape(subject_clean)}</div>
                </div>
                <div class="field">
                    <div class="label">Time Received</div>
                    <div class="val" style="color: #a1a1aa; font-size: 12px;">{now_utc}</div>
                </div>
                <div class="field">
                    <div class="label">Message / Query</div>
                    <div class="message-box">{escaped_msg}</div>
                </div>
            </div>
            <div class="footer">
                You can reply directly to this email to contact {html.escape(name_clean)} at {email_clean}.
            </div>
        </div>
    </body>
    </html>
    """

    # Also notify superusers in system
    destinations = {dest_email}
    try:
        super_res = await db.execute(select(User.email).where(User.is_super_user.is_(True)))
        for s_email in super_res.scalars().all():
            if s_email:
                destinations.add(s_email.strip().lower())
    except Exception as exc:
        log.warning("[contact-superusers-lookup-failed] %s", exc)

    for to_addr in destinations:
        try:
            await send_email(
                to=to_addr,
                subject=f"[WebinarFlow Query] {subject_clean} — {name_clean}",
                body=support_html,
            )
        except Exception as exc:
            log.warning("[contact-send-support-failed] to=%s error=%s", to_addr, exc)

    # 2. Dispatch polite auto-acknowledgment receipt to the sender
    ack_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d0d0f; color: #ffffff; padding: 24px; }}
            .container {{ max-width: 540px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #6E1F32 0%, #852533 100%); padding: 24px; text-align: center; }}
            .content {{ padding: 24px; }}
            .message-copy {{ background: #09090b; border: 1px solid #27272a; border-radius: 10px; padding: 14px; margin-top: 12px; font-size: 12px; color: #a1a1aa; line-height: 1.5; }}
            .footer {{ padding: 16px 24px; background: #121215; border-top: 1px solid #27272a; font-size: 11px; color: #71717a; text-align: center; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin:0; color:#ffffff; font-size: 20px;">We've Received Your Message</h2>
                <p style="margin:4px 0 0; color:#fbcfe8; font-size: 12px;">WebinarFlow.AI Support</p>
            </div>
            <div class="content">
                <p style="font-size: 14px; color: #f4f4f5; line-height: 1.5;">Hi {html.escape(name_clean)},</p>
                <p style="font-size: 13px; color: #d4d4d8; line-height: 1.6;">
                    Thank you for reaching out to WebinarFlow. We have received your query regarding <strong>"{html.escape(subject_clean)}"</strong>.
                </p>
                <p style="font-size: 13px; color: #d4d4d8; line-height: 1.6;">
                    Our team reviews all inquiries promptly and will get back to you at <strong>{email_clean}</strong> as soon as possible.
                </p>
                <div class="message-copy">
                    <strong style="color: #ffffff;">Your Message:</strong><br>
                    {escaped_msg}
                </div>
            </div>
            <div class="footer">
                &copy; {datetime.now().year} WebinarFlow.AI &bull; <a href="https://webinarflow.in" style="color: #f43f5e; text-decoration: none;">webinarflow.in</a>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        await send_email(
            to=email_clean,
            subject="We received your message — WebinarFlow.AI Support",
            body=ack_html,
        )
    except Exception as exc:
        log.warning("[contact-send-ack-failed] to=%s error=%s", email_clean, exc)

    return {
        "status": "success",
        "message": "Thank you! Your message has been sent. We will get back to you shortly.",
    }

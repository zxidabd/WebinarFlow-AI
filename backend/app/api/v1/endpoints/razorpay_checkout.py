"""Standard Razorpay Web Checkout endpoints.

Provides:
- POST /api/create-order: Generates a Razorpay order ID using the standard SDK/API
- POST /api/verify-payment: Cryptographically validates the HMAC-SHA256 signature
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
import razorpay

from app.core.config import settings

logger = logging.getLogger("webinarflow.razorpay")

router = APIRouter()


class CreateOrderRequest(BaseModel):
    amount: int = Field(
        ...,
        description="Amount in paise (1 INR = 100 paise). Must be at least 100 paise.",
        json_schema_extra={"example": 50000},
    )
    currency: str = Field(
        default="INR",
        description="3-letter currency code (e.g., INR, USD).",
        json_schema_extra={"example": "INR"},
    )
    receipt: str | None = Field(
        default=None,
        description="Optional internal receipt or reference ID.",
        json_schema_extra={"example": "rcpt_123456"},
    )
    notes: dict[str, Any] | None = Field(
        default=None,
        description="Optional key-value metadata to attach to the order.",
    )


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str = Field(..., description="Razorpay order ID from checkout modal")
    razorpay_payment_id: str = Field(..., description="Razorpay payment ID from checkout modal")
    razorpay_signature: str = Field(..., description="Razorpay signature from checkout modal")


class VerifyPaymentResponse(BaseModel):
    status: str
    message: str
    order_id: str
    payment_id: str


def _get_razorpay_credentials() -> tuple[str, str]:
    """Retrieve Razorpay key ID and Secret from settings or environment variables."""
    key_id = (settings.RAZORPAY_KEY_ID or os.getenv("RAZORPAY_KEY_ID", "")).strip()
    key_secret = (settings.RAZORPAY_KEY_SECRET or os.getenv("RAZORPAY_KEY_SECRET", "")).strip()

    if not key_id or not key_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Razorpay credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env",
        )
    return key_id, key_secret


@router.post("/create-order", response_model=CreateOrderResponse, status_code=status.HTTP_200_OK)
async def create_order(payload: CreateOrderRequest):
    """Create a new Razorpay order.

    Validates amount >= 100 paise and requests order creation from Razorpay API.
    """
    # 1. Validate minimum amount (100 paise = 1 INR)
    if payload.amount < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Amount must be at least 100 paise (1 INR).",
        )

    # 2. Get API credentials
    key_id, key_secret = _get_razorpay_credentials()

    # 3. Prepare payload for Razorpay API
    order_data: dict[str, Any] = {
        "amount": payload.amount,
        "currency": payload.currency.upper(),
        "payment_capture": 1,
    }
    if payload.receipt:
        order_data["receipt"] = str(payload.receipt)[:40]
    if payload.notes:
        order_data["notes"] = {str(k)[:40]: str(v)[:100] for k, v in payload.notes.items()}

    # 4. Call Razorpay API via SDK
    try:
        client = razorpay.Client(auth=(key_id, key_secret))
        order = client.order.create(data=order_data)
    except Exception as exc:
        logger.error(f"Razorpay API error creating order: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Razorpay order creation failed: {str(exc)}",
        )

    if not order or "id" not in order:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid response received from Razorpay API.",
        )

    return CreateOrderResponse(
        order_id=order["id"],
        amount=order["amount"],
        currency=order["currency"],
        key_id=key_id,
    )


@router.post("/verify-payment", response_model=VerifyPaymentResponse, status_code=status.HTTP_200_OK)
async def verify_payment(payload: VerifyPaymentRequest):
    """Verify the authenticity of a Razorpay payment using HMAC-SHA256 signature verification."""
    # 1. Validate required fields
    if not payload.razorpay_order_id or not payload.razorpay_payment_id or not payload.razorpay_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are all required.",
        )

    # 2. Get secret key
    _, key_secret = _get_razorpay_credentials()

    # 3. Calculate expected HMAC-SHA256 signature
    message = f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode("utf-8")
    generated_signature = hmac.new(
        key_secret.encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()

    # 4. Secure constant-time comparison
    if not hmac.compare_digest(generated_signature, payload.razorpay_signature):
        logger.warning(
            f"Razorpay signature mismatch for order {payload.razorpay_order_id}. "
            f"Expected {generated_signature}, got {payload.razorpay_signature}"
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment signature verification failed. The payment could not be authenticated.",
        )

    logger.info(
        f"Razorpay payment verified successfully: order_id={payload.razorpay_order_id}, payment_id={payload.razorpay_payment_id}"
    )

    return VerifyPaymentResponse(
        status="success",
        message="Payment verified successfully",
        order_id=payload.razorpay_order_id,
        payment_id=payload.razorpay_payment_id,
    )

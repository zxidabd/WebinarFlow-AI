"use client";

import React, { useState } from "react";
import Script from "next/script";
import { toast } from "sonner";
import { Loader2, CreditCard, ShieldCheck } from "lucide-react";

interface RazorpayCheckoutButtonProps {
  amount?: number; // In paise (e.g., 50000 = ₹500.00)
  currency?: string; // Default: 'INR'
  receipt?: string;
  notes?: Record<string, any>;
  name?: string;
  description?: string;
  buttonText?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  themeColor?: string;
  className?: string;
  onSuccess?: (response: {
    orderId: string;
    paymentId: string;
    signature: string;
    verifiedData: any;
  }) => void;
  onError?: (error: any) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function loadRazorpaySDK(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      return resolve(true);
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function RazorpayCheckoutButton({
  amount = 50000,
  currency = "INR",
  receipt,
  notes,
  name = "WebinarFlow.AI",
  description = "Standard Web Checkout",
  buttonText = "Pay with Razorpay",
  prefill,
  themeColor = "#4f46e5",
  className = "",
  onSuccess,
  onError,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const getApiEndpoint = (endpoint: string) => {
    // If running in browser, try local proxy rewrite first, or direct API URL
    const rawApi = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
    if (rawApi.includes("localhost:8000")) {
      return `http://localhost:8000${endpoint}`;
    }
    // Fallback: standard path (rewritten by next.config.mjs to backend)
    return endpoint;
  };

  const handlePayment = async () => {
    try {
      setLoading(true);

      // 1. Ensure Razorpay SDK is loaded
      const isLoaded = await loadRazorpaySDK();
      if (!isLoaded || typeof window.Razorpay === "undefined") {
        throw new Error("Failed to load Razorpay SDK. Please check your internet connection.");
      }

      // 2. Call backend to create order
      const createOrderUrl = getApiEndpoint("/api/create-order");
      const orderRes = await fetch(createOrderUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency,
          receipt: receipt || `rcpt_${Date.now()}`,
          notes,
        }),
      });

      if (!orderRes.ok) {
        let errMsg = "Failed to create Razorpay order.";
        try {
          const errData = await orderRes.json();
          errMsg = errData.detail || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      const orderData = await orderRes.json();
      const { order_id, key_id } = orderData;

      // 3. Configure Razorpay Standard Checkout options
      const options = {
        key: key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name,
        description,
        order_id,
        prefill: {
          name: prefill?.name || "",
          email: prefill?.email || "",
          contact: prefill?.contact || "",
        },
        theme: {
          color: themeColor,
        },
        // On payment success: verify HMAC signature on backend
        handler: async function (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) {
          try {
            toast.loading("Verifying payment signature...", { id: "rzp-verify" });

            const verifyUrl = getApiEndpoint("/api/verify-payment");
            const verifyRes = await fetch(verifyUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
              throw new Error(verifyData.detail || "Payment verification failed.");
            }

            toast.success("Payment verified successfully!", {
              id: "rzp-verify",
              description: `Payment ID: ${response.razorpay_payment_id}`,
            });

            if (onSuccess) {
              onSuccess({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                verifiedData: verifyData,
              });
            }
          } catch (verifyErr: any) {
            toast.error(verifyErr.message || "Payment verification failed", { id: "rzp-verify" });
            if (onError) onError(verifyErr);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            toast.info("Payment window was closed.");
          },
        },
      };

      // 4. Open Razorpay Checkout Modal
      const rzp = new window.Razorpay(options);

      // Handle payment failure event
      rzp.on("payment.failed", function (failResponse: any) {
        setLoading(false);
        const failReason =
          failResponse?.error?.description ||
          failResponse?.error?.reason ||
          "Transaction could not be completed.";
        toast.error("Payment Failed", { description: failReason });
        if (onError) onError(failResponse.error);
      });

      rzp.open();
    } catch (err: any) {
      setLoading(false);
      const msg = err?.message || "Failed to initialize Razorpay checkout.";
      toast.error(msg);
      if (onError) onError(err);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <button
        type="button"
        onClick={handlePayment}
        disabled={loading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c2340] hover:bg-[#14345d] text-white px-6 py-3.5 text-sm font-semibold shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            <span>{buttonText}</span>
          </>
        )}
      </button>
    </>
  );
}

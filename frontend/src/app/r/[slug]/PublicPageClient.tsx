'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import LandingPageRenderer from '@/components/landing-page/LandingPageRenderer';

interface Props {
  content: any;
  webinarId: string;
  slug: string;
  isPaid?: boolean;
  priceCents?: number;
  currency?: string;
  paymentGateway?: string;
}

function getApiUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'https://webinarflow-ai.onrender.com').replace(/\/$/, '');
  return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
}

export default function PublicPageClient({ content, webinarId, slug, isPaid, priceCents, currency, paymentGateway }: Props) {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (hasTrackedRef.current || !slug) return;
    hasTrackedRef.current = true;

    // Session guard to prevent React StrictMode or multiple re-renders from recording duplicates
    const sessionKey = `wf_v_${slug}`;
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, '1');
    }

    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const utm_source = urlParams?.get('utm_source') || undefined;
    const utm_medium = urlParams?.get('utm_medium') || undefined;
    const utm_campaign = urlParams?.get('utm_campaign') || undefined;
    const utm_content = urlParams?.get('utm_content') || undefined;
    const utm_term = urlParams?.get('utm_term') || undefined;
    const referrer = typeof document !== 'undefined' ? document.referrer || undefined : undefined;

    const apiUrl = getApiUrl();
    fetch(`${apiUrl}/landing-pages/public/${encodeURIComponent(slug)}/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrer,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
      }),
    }).catch(() => {
      // Non-blocking visit tracking
    });
  }, [slug]);
  const handleRegister = async (email: string, fullName?: string): Promise<any> => {
    try {
      const apiUrl = getApiUrl();
      const params = new URLSearchParams({ email });
      if (fullName) params.set('full_name', fullName);

      // Endpoint: /landing-pages/public/{slug}/register
      const res = await fetch(`${apiUrl}/landing-pages/public/${encodeURIComponent(slug)}/register?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, full_name: fullName }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail || 'Registration failed. Please try again.');
      }

      const regData = await res.json();

      // If Paid Webinar with Stripe: redirect to Stripe Checkout
      if (regData.checkout_url) {
        window.location.href = regData.checkout_url;
        return regData;
      }

      // If Paid Webinar with Razorpay: open Razorpay Checkout modal
      if (regData.razorpay && regData.razorpay.order_id) {
        return new Promise((resolve, reject) => {
          if (typeof window === 'undefined' || !(window as any).Razorpay) {
            reject(new Error('Razorpay SDK is loading or unavailable. Please try again.'));
            return;
          }

          const rzpOptions = {
            key: regData.razorpay.key_id,
            amount: regData.razorpay.amount,
            currency: regData.razorpay.currency || 'INR',
            name: 'Webinar Registration',
            description: `Registration for ${content?.headline || 'Webinar'}`,
            order_id: regData.razorpay.order_id,
            method: {
              upi: true,
              card: true,
              netbanking: true,
              wallet: true,
            },
            prefill: {
              name: fullName || '',
              email: email || '',
            },
            theme: {
              color: '#4f46e5',
            },
            handler: async function (response: any) {
              try {
                // Verify signature on backend
                const verifyRes = await fetch(`${apiUrl}/landing-pages/public/${encodeURIComponent(slug)}/verify-razorpay`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    registrant_id: regData.registrant_id,
                  }),
                });

                if (!verifyRes.ok) {
                  const errJson = await verifyRes.json().catch(() => ({}));
                  throw new Error(errJson?.detail || 'Payment verification failed');
                }

                const verifyData = await verifyRes.json();
                resolve({ ...regData, verified: true, payment: verifyData });
              } catch (verifyErr: any) {
                reject(verifyErr);
              }
            },
            modal: {
              ondismiss: function () {
                reject(new Error('Payment checkout was cancelled.'));
              },
            },
          };

          const rzpInstance = new (window as any).Razorpay(rzpOptions);
          rzpInstance.open();
        });
      }

      if (isPaid) {
        throw new Error('Payment checkout could not be created. Please contact the event organizer.');
      }

      return regData;
    } catch (err: any) {
      console.error('Registration API error:', err);
      throw err;
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <LandingPageRenderer
        content={content}
        webinarId={webinarId}
        onRegister={handleRegister}
        isPaid={isPaid}
        priceCents={priceCents}
        currency={currency}
        paymentGateway={paymentGateway}
      />
    </>
  );
}

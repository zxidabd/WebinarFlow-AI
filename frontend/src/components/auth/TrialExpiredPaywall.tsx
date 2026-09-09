'use client';

import { useState } from 'react';
import { Shield, Sparkles, Check, ArrowRight, LogOut, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const PLANS = [
  {
    tier: 'starter',
    name: 'Starter',
    price: { monthly: '$9.99', yearly: '$79.9' },
    priceLabel: { monthly: '/mo', yearly: '/year' },
    features: [
      '3 Webinars',
      '2 Funnels per webinar',
      '100 AI Agent chats/month',
      '300 Registrants per webinar',
      'Basic analytics',
      'Normal support',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: { monthly: '$19.99', yearly: '$179.9' },
    priceLabel: { monthly: '/mo', yearly: '/year' },
    popular: true,
    features: [
      '7 Webinars',
      '4 Funnels per webinar',
      '200 AI Agent chats/month',
      '600 Registrants per webinar',
      'Advanced analytics & customer views',
      'Priority support',
    ],
  },
];

type Cycle = 'monthly' | 'yearly';

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && (window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function TrialExpiredPaywall() {
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const clear = useAuthStore((s) => s.clear);

  const handleSubscribe = async (tier: string, provider: 'stripe' | 'razorpay') => {
    setLoading(`${tier}-${provider}`);
    try {
      const res = await api.post(`/payments/subscribe/${provider}`, {
        plan_tier: tier,
        billing_cycle: cycle,
      });

      if (provider === 'stripe' && res.data?.url) {
        window.location.href = res.data.url;
      } else if (provider === 'razorpay' && res.data?.order_id) {
        await loadRazorpayScript();
        if (typeof window === 'undefined' || !(window as any).Razorpay) {
          throw new Error('Razorpay SDK failed to load. Please disable ad-blockers or try another browser.');
        }

        // Open Razorpay checkout popup
        const options = {
          key: res.data.key_id,
          amount: res.data.amount,
          currency: res.data.currency,
          name: 'WebinarFlow.AI',
          description: `${tier.charAt(0).toUpperCase() + tier.slice(1)} Plan (${cycle})`,
          order_id: res.data.order_id,
          prefill: {
            email: res.data.user_email || '',
            name: res.data.user_name || '',
          },
          handler: async function (response: any) {
            try {
              toast.loading('Verifying payment and activating your plan...');
              await api.post('/payments/subscribe/razorpay/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_tier: tier,
              });
              toast.dismiss();
              toast.success('Payment verified! Plan activated successfully.');
              setTimeout(() => window.location.reload(), 1200);
            } catch {
              toast.dismiss();
              toast.success('Payment received! Finalizing activation...');
              setTimeout(() => window.location.reload(), 2000);
            }
          },
          modal: {
            ondismiss: function () {
              setLoading(null);
            },
          },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        return;
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Payment failed. Please try again.';
      toast.error(detail);
    } finally {
      setLoading(null);
    }
  };

  const handleLogout = () => {
    clear();
    localStorage.removeItem('webinarflow-auth');
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
            <Shield className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">
            Your Free Trial Has Expired
          </h1>
          <p className="mt-2 text-sm text-gray-400 max-w-md mx-auto">
            Your 3-day free trial has ended. Subscribe to a plan below to continue using WebinarFlow.AI.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0A0A0A] p-1">
            {(['monthly', 'yearly'] as Cycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`relative rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors duration-200 ${
                  cycle === c ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
                }`}
              >
                {c}
                {c === 'yearly' && <span className="ml-1 text-xs text-green-400">Save</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.tier}
              className={`relative rounded-2xl border p-6 ${
                plan.popular
                  ? 'border-white/25 bg-[#0D0D0D] shadow-lg shadow-white/5'
                  : 'border-white/10 bg-[#0A0A0A]'
              }`}
            >
              {plan.popular && (
                <div className="absolute right-4 top-4">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white">
                    <Sparkles className="h-3 w-3" />
                    Popular
                  </span>
                </div>
              )}

              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-3xl font-bold text-white">{plan.price[cycle]}</span>
                <span className="mb-0.5 text-sm text-gray-500">{plan.priceLabel[cycle]}</span>
              </div>

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <Check className="h-3.5 w-3.5 shrink-0 text-green-400" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Payment buttons */}
              <div className="mt-6 space-y-2">
                <button
                  onClick={() => handleSubscribe(plan.tier, 'stripe')}
                  disabled={loading !== null}
                  className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                    plan.popular
                      ? 'bg-white text-black hover:bg-gray-200'
                      : 'bg-[#635bff] text-white hover:bg-[#5349e0]'
                  } disabled:opacity-50`}
                >
                  {loading === `${plan.tier}-stripe` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Pay with Stripe (Card)
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleSubscribe(plan.tier, 'razorpay')}
                  disabled={loading !== null}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#0c2340] px-4 py-2.5 text-sm font-semibold text-sky-300 hover:bg-[#0c2340]/80 transition-all disabled:opacity-50"
                >
                  {loading === `${plan.tier}-razorpay` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Pay with Razorpay (UPI/Cards)
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Logout */}
        <div className="mt-6 text-center">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

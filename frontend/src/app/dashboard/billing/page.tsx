'use client';

import { useState } from 'react';
import { Check, Sparkles, Shield, ArrowRight, Zap, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const PLANS = [
  {
    tier: 'starter',
    name: 'Starter',
    monthlyPrice: 9.99,
    yearlyPrice: 79.9,
    monthlyPriceEquivalent: 6.66,
    description: 'For creators and hosts starting out with webinar funnels.',
    features: [
      '3 Webinars',
      '2 Funnels per webinar',
      '15 AI Agent chats/month',
      '300 Registrants per webinar',
      'Basic analytics',
      'Normal support',
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    monthlyPrice: 19.99,
    yearlyPrice: 179.9,
    monthlyPriceEquivalent: 15.0,
    popular: true,
    description: 'For growing creators scaling webinars and conversions.',
    features: [
      '7 Webinars',
      '4 Funnels per webinar',
      '50 AI Agent chats/month',
      '600 Registrants per webinar',
      'Advanced analytics & customer views',
      'Priority support',
    ],
  },
];

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

export default function BillingPage() {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

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

        const options = {
          key: res.data.key_id,
          amount: res.data.amount,
          currency: res.data.currency,
          name: 'WebinarFlow.AI',
          description: `${tier.toUpperCase()} Plan (${cycle})`,
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
              setTimeout(() => (window.location.href = '/dashboard'), 1200);
            } catch {
              toast.dismiss();
              toast.success('Payment received! Finalizing activation...');
              setTimeout(() => (window.location.href = '/dashboard'), 1500);
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
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to initiate checkout. Please try again.';
      toast.error(detail);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <Badge className="bg-[#852533]/10 text-[#852533] dark:text-[#f8a5b2] border-[#852533]/20">
          Subscription & Plans
        </Badge>
        <h1 className="text-3xl font-bold text-foreground">Upgrade Your WebinarFlow Plan</h1>
        <p className="text-muted-foreground text-sm">
          Select the plan that fits your webinar growth. Instant activation with full features.
        </p>

        {/* Current Plan Status */}
        {user && (
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground">
            <span>Current Status:</span>
            <strong className="text-foreground uppercase">{user.subscription_status || 'Trialing'}</strong>
            <span>•</span>
            <span>Tier:</span>
            <strong className="text-[#852533] uppercase">{user.plan_tier || 'Free Trial'}</strong>
          </div>
        )}

        {/* Billing cycle toggle */}
        <div className="flex items-center justify-center pt-2">
          <div className="flex items-center rounded-full border border-border bg-muted/40 p-1 text-xs">
            <button
              onClick={() => setCycle('monthly')}
              className={`rounded-full px-4 py-1.5 font-medium transition-all ${
                cycle === 'monthly' ? 'bg-[#852533] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setCycle('yearly')}
              className={`rounded-full px-4 py-1.5 font-medium transition-all flex items-center gap-1.5 ${
                cycle === 'yearly' ? 'bg-[#852533] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Yearly
              <span className="rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 text-[10px] font-bold">
                SAVE 33%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto pt-4">
        {PLANS.map((plan) => {
          const isCurrentPlan = user?.plan_tier === plan.tier && user?.subscription_status === 'active';
          const price = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

          return (
            <Card
              key={plan.tier}
              className={`relative flex flex-col justify-between border-2 transition-all ${
                plan.popular
                  ? 'border-[#852533] shadow-lg shadow-[#852533]/5 bg-card'
                  : 'border-border bg-card hover:border-border/80'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#852533] text-white border-none shadow-sm flex items-center gap-1 text-xs font-semibold px-3 py-0.5">
                    <Sparkles className="w-3 h-3" /> Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="pt-6">
                <CardTitle className="text-xl font-bold flex items-center justify-between">
                  {plan.name}
                  {isCurrentPlan && (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 text-xs">
                      Active Plan
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">{plan.description}</CardDescription>

                <div className="pt-4 pb-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-foreground">${price}</span>
                    <span className="text-muted-foreground text-xs">/{cycle === 'yearly' ? 'year' : 'month'}</span>
                  </div>
                  {cycle === 'yearly' && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                      Equivalent to ${plan.monthlyPriceEquivalent}/mo billed annually
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2.5 border-t border-border pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What&apos;s Included:</p>
                  <ul className="space-y-2 text-xs">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2 text-foreground">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Checkout Buttons */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <Button
                    onClick={() => handleSubscribe(plan.tier, 'stripe')}
                    disabled={Boolean(loading)}
                    className="w-full bg-[#4a6cf7] hover:bg-[#3b5bd8] text-white flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    {isCurrentPlan ? 'Renew with Card (Stripe)' : 'Pay with Card (Stripe)'}
                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                  </Button>

                  <Button
                    onClick={() => handleSubscribe(plan.tier, 'razorpay')}
                    disabled={Boolean(loading)}
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 border-border hover:bg-muted"
                  >
                    <Zap className="w-4 h-4 text-blue-500" />
                    {isCurrentPlan ? 'Renew with UPI / Cards (Razorpay)' : 'Pay with UPI / Cards (Razorpay)'}
                    <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

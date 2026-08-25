'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { slideUp, staggerContainer, viewportOnce } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface Plan {
  name: string;
  price: { monthly: number; yearly: number };
  description: string;
  features: string[];
  popular?: boolean;
  cta: string;
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    price: { monthly: 29, yearly: 23 },
    description: 'For solo creators running their first webinar funnels.',
    features: [
      'Up to 3 funnels',
      'AI webinar generator',
      'Email automation (5k/mo)',
      '1 workspace',
      'Basic analytics',
    ],
    cta: 'Start Free Trial',
  },
  {
    name: 'Growth',
    price: { monthly: 79, yearly: 63 },
    description: 'For teams scaling webinars and multi-channel follow-up.',
    features: [
      'Unlimited funnels',
      'WhatsApp + Email automation',
      'CRM with deal pipeline',
      '5 workspaces',
      'Advanced analytics & attribution',
      'Priority support',
    ],
    popular: true,
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    price: { monthly: 199, yearly: 159 },
    description: 'For organizations with custom workflow & security needs.',
    features: [
      'Everything in Growth',
      'Custom AI agents',
      'SSO & advanced security',
      'Unlimited workspaces',
      'Dedicated success manager',
      'SLA & onboarding',
    ],
    cta: 'Book Demo',
  },
];

type Cycle = 'monthly' | 'yearly';

export default function Pricing() {
  const [cycle, setCycle] = useState<Cycle>('monthly');

  return (
    <section id="pricing" className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-24">
      {/* Background ambient glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.02] blur-[140px]" />

      <motion.div
        variants={staggerContainer(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="relative mx-auto max-w-2xl text-center"
      >
        <motion.span
          variants={slideUp}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#D6D6D6]"
        >
          Pricing
        </motion.span>
        <motion.h2
          variants={slideUp}
          className="mt-5 text-4xl font-semibold tracking-tight text-[#F5F5F5] sm:text-5xl"
        >
          Start free. <span className="text-gradient">Scale when you grow.</span>
        </motion.h2>
        <motion.p variants={slideUp} className="mt-4 text-base text-[#B8B8B8] sm:text-lg">
          Simple, transparent pricing. No hidden fees. Cancel anytime.
        </motion.p>

        {/* Billing toggle */}
        <motion.div variants={slideUp} className="mt-8 inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0A0A0A] p-1 shadow-sm">
          {(['monthly', 'yearly'] as Cycle[]).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={cn(
                'relative rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors duration-200',
                cycle === c ? 'text-white' : 'text-[#B8B8B8]/60 hover:text-white',
              )}
            >
              {cycle === c && (
                <motion.span
                  layoutId="cycle-pill"
                  className="absolute inset-0 rounded-full border border-white/20 bg-[#161616]"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {c}
                {c === 'yearly' && <span className="ml-1 text-xs text-[#D6D6D6]">-20%</span>}
              </span>
            </button>
          ))}
        </motion.div>
      </motion.div>

      {/* Cards */}
      <motion.div
        variants={staggerContainer(0.12, 0.1)}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="relative mt-14 grid grid-cols-1 items-start gap-6 lg:grid-cols-3"
      >
        {PLANS.map((plan) => (
          <motion.div
            key={plan.name}
            variants={slideUp}
            whileHover={{ y: -6 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className={cn(
              'group relative',
              plan.popular && 'lg:-mt-2',
            )}
          >
            {/* Glow border for popular plan */}
            {plan.popular && (
              <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-white/25 via-white/5 to-transparent opacity-100 blur-[3px]" />
            )}

            <div
              className={cn(
                'relative flex h-full flex-col overflow-hidden rounded-3xl border bg-[#0A0A0A] p-6 shadow-2xl shadow-black sm:p-8 transition-all duration-300',
                plan.popular
                  ? 'border-white/25 bg-[#0D0D0D]'
                  : 'border-white/10 hover:border-white/20',
              )}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute right-5 top-5">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-md">
                    <Sparkles className="h-3 w-3 text-white" />
                    Popular
                  </div>
                </div>
              )}

              <h3 className="text-xl font-semibold text-[#F5F5F5]">{plan.name}</h3>
              <p className="mt-2 text-sm text-[#B8B8B8]/70">{plan.description}</p>

              {/* Price */}
              <div className="mt-6 flex items-end gap-1">
                <span className="text-4xl font-semibold tracking-tight text-[#F5F5F5]">
                  ${plan.price[cycle]}
                </span>
                <span className="mb-1 text-sm text-[#B8B8B8]/50">/mo</span>
              </div>
              <p className="mt-1 text-xs text-[#B8B8B8]/40">
                {cycle === 'yearly' ? 'billed annually' : 'billed monthly'}
              </p>

              {/* CTA button */}
              <a
                href={plan.name === 'Enterprise' ? '#dashboard' : '/register'}
                className={cn(
                  'group/btn mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all duration-300',
                  plan.popular
                    ? 'bg-white text-black shadow-lg shadow-white/10 hover:bg-[#E5E5E5]'
                    : 'border border-[#333333] bg-[#121212] text-white hover:border-[#555555] hover:bg-[#1A1A1A]',
                )}
              >
                {plan.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
              </a>

              {/* Features */}
              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-[#B8B8B8]">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

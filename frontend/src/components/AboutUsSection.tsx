'use client';

import React from 'react';
import {
  Sparkles,
  Layers,
  Bot,
  Globe2,
  Users2,
  Database,
  BarChart3,
  TrendingUp,
  CreditCard,
} from 'lucide-react';

const ABOUT_POINTS = [
  {
    icon: Layers,
    title: 'High-Converting AI Landing Pages',
    desc: 'We help you create AI-powered landing pages that are ready to publish and designed to attract customers for your business or course.',
  },
  {
    icon: Bot,
    title: 'AI Scripting & 1-Shot Funnel Creation',
    desc: 'We help you create webinar scripts with the help of our AI agent. You can even ask the AI agent to build your entire funnel, and your page will be ready to publish in just one shot.',
  },
  {
    icon: Globe2,
    title: 'Instant 1-Click Publishing',
    desc: 'With just one click, you can make your created business website live and shareable under our domain.',
  },
  {
    icon: Users2,
    title: 'Frictionless Webinar Registration',
    desc: 'We allow your customers to register for your webinars through your webinar funnels and landing pages.',
  },
  {
    icon: Database,
    title: 'Automated Lead & Contact Management',
    desc: 'We help you collect and store your registrants\' contact details so you can follow up with them later.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics & Customer Hub',
    desc: 'We help you track your growth and scale through our Analytics and Customer sections. You can track your recent visitors, leads, and webinar registrants from your landing pages.',
  },
  {
    icon: TrendingUp,
    title: 'High-Converting Offer Delivery',
    desc: 'We help you turn your webinars into successful offers.',
  },
  {
    icon: CreditCard,
    title: 'Direct-to-Bank Monetization & Payment Tracking',
    desc: 'We also allow you to accept paid webinar registrations by connecting your preferred payment gateway through our dashboard settings. The money goes directly to your account, and you can track all payments from each registrant through your Panel.',
  },
];

export default function AboutUsSection() {
  return (
    <section id="about" className="relative scroll-mt-24 py-24 sm:py-32 bg-black text-white overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0%,transparent_70%)] blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-1.5 backdrop-blur-md mb-4 shadow-[0_0_20px_rgba(255,255,255,0.02)]">
            <Sparkles className="h-3.5 w-3.5 text-[#f8a5b2]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
              Our Mission & Platform
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            About{' '}
            <span className="bg-gradient-to-r from-white via-[#fbcfe8] to-[#f43f5e] bg-clip-text text-transparent">
              WebinarFlow.AI
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-gray-400">
            The all-in-one AI funnel workspace empowering creators, educators, and businesses to
            launch high-converting webinars, capture leads, and automate revenue.
          </p>
        </div>

        {/* 8 Core Feature Pillars Grid */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {ABOUT_POINTS.map((pt, idx) => {
            const Icon = pt.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-3xl border border-white/[0.08] bg-[#0d0d0f]/90 p-7 sm:p-8 backdrop-blur-xl transition-all duration-300 hover:border-[#852533]/50 hover:bg-[#12080a]/90 hover:shadow-[0_8px_30px_rgba(133,37,51,0.15)]"
              >
                <div className="flex items-start gap-4 sm:gap-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#852533] to-[#551827] text-white shadow-md border border-[#a63344]/30 transition-transform duration-300 group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[#f8a5b2] transition-colors">
                      {pt.title}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm leading-relaxed text-gray-400">
                      {pt.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

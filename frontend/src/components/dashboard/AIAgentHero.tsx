'use client';

import { Sparkles, Wand2, FileText, Video, ClipboardList, CreditCard, Mail, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GENERATE_ITEMS = [
  { label: 'Landing Pages', icon: FileText },
  { label: 'Webinar Pages', icon: Video },
  { label: 'Registration Forms', icon: ClipboardList },
  { label: 'Payment Flows', icon: CreditCard },
  { label: 'Email Campaigns', icon: Mail },
  { label: 'Customer Tracking', icon: LineChart },
];

export function AIAgentHero() {
  const openWizard = () => {
    if (typeof window !== 'undefined') {
      console.info('[WebinarFlow AI] Generate Webinar Funnel — wizard lands in Phase 3');
    }
  };

  return (
    <section
      id="ai-hero"
      className="relative overflow-hidden rounded-2xl p-6 sm:p-10 text-white shadow-2xl transition-all duration-300 border border-[#5a1a23]/50 bg-gradient-to-r from-[#1c080b] via-[#380f15] to-[#4d151e]"
    >
      {/* Subtle grid pattern on the right side */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-2/3 opacity-25 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(ellipse_60%_70%_at_75%_40%,#000_70%,transparent_100%)]"
      />

      {/* Deep Burgundy ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-96 w-96 rounded-full bg-[#962534]/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#7a1b28]/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 right-1/4 h-80 w-80 rounded-full bg-[#b82e40]/20 blur-3xl"
      />

      <div className="relative max-w-3xl space-y-6">
        {/* Burgundy badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#7a222f]/60 bg-[#2b0c11]/80 px-3.5 py-1 text-xs font-semibold text-[#f8d7dc] backdrop-blur-md shadow-inner">
          <Sparkles className="h-3.5 w-3.5 text-[#f39ca9] animate-pulse" />
          <span>AI Agent Experience</span>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl flex items-center gap-2.5">
            <span className="text-amber-300">✨</span> Build High-Converting Webinar Funnels with AI
          </h2>
          <p className="mt-2 text-sm text-[#f1d0d5]/90 sm:text-base leading-relaxed max-w-2xl">
            Generate high-converting landing pages, scripts, registration flows, and automated email sequences in seconds.
          </p>
        </div>

        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#e68a98]">Full Funnel Generation</p>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GENERATE_ITEMS.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl border border-[#5c1a23] bg-[#22070a]/60 px-4 py-3 text-xs font-medium text-white backdrop-blur-md shadow-sm transition-all duration-200 hover:border-[#852533] hover:bg-[#2d0a0e]/80 hover:scale-[1.01]"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#45141B] text-[#f8a5b2] border border-[#6b202c]">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="truncate">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            onClick={openWizard}
            className="font-semibold bg-gradient-to-r from-[#6b1e28] via-[#852533] to-[#731f2b] hover:from-[#7d232f] hover:to-[#8a2635] text-white px-6 py-3 rounded-xl border border-[#a63344]/40 shadow-lg shadow-[#2a060a]/60 hover:shadow-[#45141B]/50 transition-all hover:scale-[1.01]"
          >
            <Wand2 className="h-4 w-4 text-[#f8d7dc]" />
            <span>Generate Webinar Funnel</span>
          </Button>
        </div>
      </div>
    </section>
  );
}

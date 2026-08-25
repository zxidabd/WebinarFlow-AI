'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp, Mail, MessageCircle, Sparkles, ArrowRight, Play,
  Check, Magnet, Users, CreditCard, BarChart3, Globe, Presentation, Send,
} from 'lucide-react';
import { fadeIn, slideUp, slideDown, staggerContainer, EASE_OUT } from '@/lib/motion';

/* ─────────────────────────── Metallic gradient tokens ─────────────────────────── */
const METAL =
  'linear-gradient(135deg,#6b6b6f 0%,#c8c8cc 15%,#e8e8ea 28%,#f5f5f7 42%,#c0c0c4 55%,#9a9a9e 68%,#d4d4d8 82%,#707074 100%)';
const METAL_TEXT =
  'linear-gradient(180deg,#ffffff 0%,#e0e0e4 18%,#d0d0d4 32%,#8a8a8f 52%,#b8b8bc 68%,#e0e0e4 82%,#ffffff 100%)';
const METAL_RING =
  'linear-gradient(180deg,rgba(255,255,255,0.4) 0%,#c4c4c8 4%,#d8d8dc 10%,#eaeaee 20%,#f5f5f8 30%,#e4e4e8 40%,#c4c4c8 50%,#a4a4a8 60%,#848488 72%,#646468 85%,#4a4a4e 100%)';
const METAL_RIM =
  'linear-gradient(180deg,#404044 0%,#707074 30%,#909094 50%,#707074 70%,#505054 100%)';

/* ─────────────────────────── Data ─────────────────────────── */
const STATS = [
  { Icon: TrendingUp, label: 'Revenue +248%', sub: 'This month', pos: 'top-[20%] left-[3%]' as const, delay: 0 },
  { Icon: Mail, label: '12,480 emails sent', sub: 'Campaign live', pos: 'top-[14%] right-[3%]' as const, delay: 0.2 },
  { Icon: MessageCircle, label: 'WhatsApp replies 94%', sub: 'Open rate', pos: 'bottom-[24%] left-[3%]' as const, delay: 0.4 },
];

const FUNNEL_STAGES = [
  { Icon: Magnet, label: 'ATTRACT', sub: 'AI Landing Pages', pct: 100 },
  { Icon: Users,  label: 'ENGAGE',  sub: 'Webinar Registration', pct: 84 },
  { Icon: Send,   label: 'NURTURE', sub: 'AI Email & WhatsApp', pct: 68 },
  { Icon: Play,   label: 'CONVERT', sub: 'Webinar & Offer', pct: 52 },
  { Icon: BarChart3, label: 'GROW', sub: 'Analytics & Scale', pct: 38 },
];

const BOTTOM_FEATURES = [
  { Icon: Globe,          title: 'AI Landing Page',     desc: 'High-converting pages in seconds' },
  { Icon: Presentation,   title: 'AI Webinar Script',   desc: 'Persuasive scripts that drive engagement' },
  { Icon: Mail,           title: 'Email Campaigns',     desc: 'Automated sequences that nurture & convert' },
  { Icon: MessageCircle,  title: 'WhatsApp Flows',      desc: 'Smart outreach that gets replies' },
  { Icon: CreditCard,     title: 'Payments & Offers',   desc: 'Collect payments seamlessly' },
  { Icon: BarChart3,      title: 'Analytics Dashboard', desc: 'Track performance and maximize ROI' },
];

/* ─────────────────────────── Sub-components ─────────────────────────── */

/** Floating glassmorphic stat card (desktop only). */
function StatChip({ Icon, label, sub, pos, delay }: (typeof STATS)[number]) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2 + delay, duration: 0.7, ease: EASE_OUT }}
      className={`absolute z-20 hidden lg:block ${pos}`}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5 + delay * 5, repeat: Infinity, ease: 'easeInOut' }}
        className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0d0d0f]/80 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
          <Icon className="h-5 w-5 text-white/70" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-xs text-[#9a9a9e]">{sub}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** A single funnel ring with its label. */
function FunnelRing({ Icon, label, sub, pct, index }: (typeof FUNNEL_STAGES)[number] & { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.6 + index * 0.12, duration: 0.6, ease: EASE_OUT }}
      className="relative flex items-center justify-center"
      style={{ width: `${pct}%` }}
    >
      {/* Elliptical top rim – simulates looking into a cylinder */}
      <div
        className="absolute -top-[7px] left-0 right-0 z-10 h-[14px] rounded-[50%]"
        style={{
          background: METAL_RIM,
          boxShadow:
            'inset 0 2px 5px rgba(255,255,255,0.18), inset 0 -2px 3px rgba(0,0,0,0.4), 0 -2px 6px rgba(255,255,255,0.06)',
        }}
      />

      {/* Ring body – the main metallic surface */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          height: 52,
          background: METAL_RING,
          borderRadius: '0 0 14px 14px',
          boxShadow:
            '0 10px 30px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
          clipPath: 'polygon(3% 0%, 97% 0%, 94% 100%, 6% 100%)',
        }}
      >
        {/* Specular highlight band */}
        <div className="absolute inset-x-[8%] top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        {/* Secondary highlight */}
        <div className="absolute inset-x-[15%] top-[6px] h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* Label – positioned to the right of the ring */}
      <div className="absolute left-[calc(100%+10px)] top-1/2 hidden -translate-y-1/2 items-center gap-2.5 whitespace-nowrap lg:flex">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.1] bg-[#0d0d0f]/90 shadow-sm">
          <Icon className="h-4 w-4 text-white/70" />
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-[0.06em] text-white">{label}</p>
          <p className="text-[10px] text-[#9a9a9e]">{sub}</p>
        </div>
      </div>

      {/* Mobile label – shown below ring on small screens */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 lg:hidden">
        <p className="text-[10px] font-bold tracking-wider text-white/80">{label}</p>
      </div>
    </motion.div>
  );
}

/** The centerpiece 3D metallic funnel visual. */
function MetallicFunnel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.9, ease: EASE_OUT }}
      className="relative mx-auto w-full max-w-[360px] lg:max-w-[400px] py-4"
    >
      {/* Ambient glow behind funnel */}
      <div className="pointer-events-none absolute inset-0 -inset-x-12 -inset-y-8">
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.04)_0%,transparent_70%)] blur-[40px]" />
      </div>

      {/* Funnel rings */}
      <div className="relative flex flex-col items-center gap-[10px]">
        {FUNNEL_STAGES.map((stage, i) => (
          <FunnelRing key={stage.label} {...stage} index={i} />
        ))}
      </div>

      {/* Glowing base / platform reflection */}
      <div className="relative mx-auto mt-5 w-[75%]">
        {/* Wide soft glow */}
        <div className="h-6 w-full rounded-[50%] bg-white/[0.05] blur-2xl" />
        {/* Bright center reflection line */}
        <div className="-mt-4 mx-auto h-[2px] w-[60%] rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        {/* Secondary diffuse glow */}
        <div className="mx-auto -mt-1 h-8 w-[85%] rounded-[50%] bg-white/[0.03] blur-xl" />
        {/* Ground ring */}
        <div className="mx-auto -mt-5 h-[2px] w-[90%] rounded-[50%] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </motion.div>
  );
}

/** Feature strip along the bottom edge. */
function FeatureStrip() {
  return (
    <div className="relative border-t border-white/[0.08]">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 divide-x divide-white/[0.06] sm:grid-cols-3 lg:grid-cols-6">
          {BOTTOM_FEATURES.map(({ Icon, title, desc }) => (
            <div key={title} className="group px-4 py-5 transition-colors hover:bg-white/[0.02] lg:px-5">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] transition-colors group-hover:border-white/[0.15]">
                <Icon className="h-4 w-4 text-white/50 group-hover:text-white/70 transition-colors" />
              </div>
              <p className="text-xs font-semibold text-white">{title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#9a9a9e]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Main Hero ─────────────────────────── */

export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-x-clip bg-black pb-0">
      {/* ── Background atmospheric effects ── */}

      {/* Radial vignette at edges */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,transparent_40%,#000_100%)]" />

      {/* Diagonal cinematic light rays */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[60%] right-[12%] h-[220%] w-[1px] rotate-[28deg] bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
        <div className="absolute -top-[50%] right-[22%] h-[200%] w-[1px] rotate-[24deg] bg-gradient-to-b from-transparent via-white/[0.025] to-transparent" />
        <div className="absolute -top-[40%] left-[30%] h-[180%] w-[1px] rotate-[-18deg] bg-gradient-to-b from-transparent via-white/[0.015] to-transparent" />
      </div>

      {/* Lens flare / starburst near headline */}
      <div className="pointer-events-none absolute left-[38%] top-[22%] h-[200px] w-[200px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06)_0%,transparent_60%)] blur-[40px]" />

      {/* ── Floating stat cards (desktop only) ── */}
      {STATS.map((s) => (
        <StatChip key={s.label} {...s} />
      ))}

      {/* ── Main content grid ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-28 sm:pt-32">
        <div className="grid min-h-[70vh] items-center gap-8 lg:grid-cols-[1fr_1fr] lg:gap-4">

          {/* ─── Left column: copy ─── */}
          <motion.div
            variants={staggerContainer(0.14, 0.15)}
            initial="hidden"
            animate="show"
            className="relative z-10 text-center lg:text-left"
          >
            {/* Announcement pill */}
            <motion.div variants={slideDown} className="mb-8 flex justify-center lg:justify-start">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-1.5 shadow-[0_0_20px_rgba(255,255,255,0.03)] backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                <span className="text-xs font-medium text-[#d4d4d8]">
                  New: AI Agent orchestration is live
                </span>
                <Sparkles className="h-3.5 w-3.5 text-white/50" />
              </div>
            </motion.div>

            {/* Headline */}
            <motion.div variants={slideUp}>
              <h1>
                {/* Lines 1-2: metallic-gradient filled text */}
                <span
                  className="block text-[clamp(2.5rem,5.5vw,5rem)] font-bold leading-[1.08] tracking-[-0.02em]"
                  style={{
                    background: METAL_TEXT,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Build AI-Powered
                </span>
                <span
                  className="block text-[clamp(2.5rem,5.5vw,5rem)] font-bold leading-[1.08] tracking-[-0.02em]"
                  style={{
                    background: METAL_TEXT,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Webinar Funnels That
                </span>

                {/* Line 3: giant "CONVERT" in brushed chrome */}
                <span className="relative mt-1 block">
                  {/* Glow layer behind (text-shadow can't work with bg-clip) */}
                  <span
                    className="pointer-events-none absolute inset-0 select-none text-[clamp(3.5rem,10vw,8rem)] font-black leading-[0.95] tracking-[-0.03em] text-white/15 blur-[18px]"
                    aria-hidden="true"
                  >
                    CONVERT
                  </span>
                  <span
                    className="relative block text-[clamp(3.5rem,10vw,8rem)] font-black leading-[0.95] tracking-[-0.03em]"
                    style={{
                      background:
                        'linear-gradient(180deg,#ffffff 0%,#e8e8ec 15%,#d4d4d8 28%,#8a8a8f 48%,#b0b0b4 62%,#dcdce0 78%,#ffffff 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    CONVERT
                  </span>
                </span>
              </h1>
            </motion.div>

            {/* Subheadline */}
            <motion.p
              variants={slideUp}
              className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-[#9a9a9e] sm:text-base lg:mx-0"
            >
              Generate landing pages, webinar scripts, email campaigns,
              WhatsApp sequences, and sales funnels with AI.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              variants={slideUp}
              className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start"
            >
              {/* Primary – metallic gradient solid button */}
              <a
                href="/register"
                className="group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full px-8 text-sm font-semibold shadow-[0_0_30px_rgba(255,255,255,0.06)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(255,255,255,0.12)] sm:w-auto"
                style={{ background: METAL }}
              >
                {/* Top-edge emboss highlight */}
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                <span className="relative z-10 text-[#0a0a0a]">Start Free Trial</span>
                <ArrowRight className="relative z-10 h-4 w-4 text-[#0a0a0a] transition-transform group-hover:translate-x-1" />
                {/* Shimmer on hover */}
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />
              </a>

              {/* Secondary – outlined dark button */}
              <a
                href="#dashboard"
                className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full border border-white/[0.12] bg-white/[0.03] px-8 text-sm font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-white/[0.2] hover:bg-white/[0.06] sm:w-auto"
              >
                <Play className="h-4 w-4 fill-white/80 text-white/80" />
                Watch Demo
              </a>
            </motion.div>

            {/* Trust row */}
            <motion.div
              variants={fadeIn}
              className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[#9a9a9e] lg:justify-start"
            >
              {['No credit card required', '14-day free trial', 'Cancel anytime'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-white/35" />
                  {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* ─── Right column: 3D metallic funnel ─── */}
          <div className="relative flex items-center justify-center lg:justify-start">
            <MetallicFunnel />
          </div>
        </div>
      </div>

      {/* ── Feature strip at bottom ── */}
      <div className="relative z-10 mt-12 lg:mt-16">
        <FeatureStrip />
      </div>
    </section>
  );
}

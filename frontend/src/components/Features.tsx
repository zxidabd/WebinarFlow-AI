'use client';

import { motion } from 'framer-motion';
import {
  Workflow,
  Presentation,
  Mail,
  MessageCircle,
  Users,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { slideUp, staggerContainer, viewportOnce } from '@/lib/motion';

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

const FEATURES: Feature[] = [
  {
    title: 'AI Funnel Builder',
    description:
      'Describe your offer and generate a complete multi-step sales funnel — pages, offers, and upsells — in seconds.',
    icon: Workflow,
  },
  {
    title: 'AI Webinar Generator',
    description:
      'Turn a topic into a full webinar script with slides, hooks, CTAs, and a registration page — ready to present.',
    icon: Presentation,
  },
  {
    title: 'AI Email Automation',
    description:
      'Auto-write pre-webinar nurture and post-webinar follow-up sequences that adapt to each registrant.',
    icon: Mail,
  },
  {
    title: 'WhatsApp Automation',
    description:
      'Reach registrants where they actually open messages with templated WhatsApp reminder sequences.',
    icon: MessageCircle,
  },
  {
    title: 'CRM',
    description:
      'Every registrant, attendee, and buyer synced to a unified pipeline with smart deal stages and tags.',
    icon: Users,
  },
  {
    title: 'Analytics',
    description:
      'Real-time registrations, attendance, conversion, and revenue — attributed back to every funnel step.',
    icon: BarChart3,
  },
];

function FeatureCard({ feature }: { feature: Feature }) {
  const { title, description, icon: Icon } = feature;
  return (
    <motion.div
      variants={slideUp}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group relative"
    >
      {/* Subtle silver glow border on hover */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/20 via-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 blur-[2px]" />
      
      <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0A] p-6 shadow-xl shadow-black/60 transition-all duration-300 group-hover:border-white/20 group-hover:bg-[#0E0E0E]">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#141414] shadow-sm text-[#D6D6D6] transition-colors group-hover:border-white/20 group-hover:text-white">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <h3 className="relative mt-5 text-lg font-semibold text-[#F5F5F5]">{title}</h3>
        <p className="relative mt-2 text-sm leading-relaxed text-[#B8B8B8]">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

export default function Features() {
  return (
    <section id="features" className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-24">
      {/* Section heading */}
      <motion.div
        variants={staggerContainer(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="mx-auto max-w-2xl text-center"
      >
        <motion.span
          variants={slideUp}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-[#D6D6D6]"
        >
          Features
        </motion.span>
        <motion.h2
          variants={slideUp}
          className="mt-5 text-4xl font-semibold tracking-tight text-[#F5F5F5] sm:text-5xl"
        >
          Everything you need to{' '}
          <span className="text-gradient">run webinars at scale</span>
        </motion.h2>
        <motion.p
          variants={slideUp}
          className="mt-4 text-base text-[#B8B8B8] sm:text-lg"
        >
          One AI platform replaces a dozen disconnected tools — from funnel to
          close.
        </motion.p>
      </motion.div>

      {/* Cards grid */}
      <motion.div
        variants={staggerContainer(0.08, 0.1)}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {FEATURES.map((f) => (
          <FeatureCard key={f.title} feature={f} />
        ))}
      </motion.div>
    </section>
  );
}

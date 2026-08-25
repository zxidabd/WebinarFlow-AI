'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Calendar } from 'lucide-react';
import { slideUp, staggerContainer, viewportOnce } from '@/lib/motion';

export default function CTA() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24">
      <motion.div
        variants={staggerContainer(0.12)}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#050505] px-6 py-20 text-center shadow-2xl shadow-black sm:px-12 sm:py-28"
      >
        {/* Atmospheric center glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[350px] w-[500px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06)_0%,transparent_70%)] blur-[80px]" />

        {/* Subtle grid pattern */}
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-15 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />

        <div className="relative z-10 mx-auto max-w-2xl">
          <motion.h2
            variants={slideUp}
            className="text-4xl font-semibold tracking-tight text-[#F5F5F5] sm:text-5xl md:text-6xl"
          >
            Launch Your Next <span className="text-gradient">Webinar Funnel</span> Today
          </motion.h2>
          <motion.p
            variants={slideUp}
            className="mx-auto mt-5 max-w-xl text-base text-[#B8B8B8] sm:text-lg"
          >
            Join thousands of creators and teams turning webinars into their most
            profitable channel — with AI doing the heavy lifting.
          </motion.p>

          <motion.div
            variants={slideUp}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <a
              href="/register"
              className="group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-white px-7 text-sm font-semibold text-black shadow-lg shadow-white/10 transition-all duration-300 hover:bg-[#E5E5E5] hover:scale-[1.02] sm:w-auto"
            >
              <span className="relative z-10">Get Started</span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#dashboard"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent px-7 text-sm font-medium text-[#D6D6D6] transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04] sm:w-auto"
            >
              <Calendar className="h-4 w-4" />
              Book Demo
            </a>
          </motion.div>

          <motion.p
            variants={slideUp}
            className="mt-6 text-xs text-[#B8B8B8]/40"
          >
            No credit card required · 14-day free trial · Cancel anytime
          </motion.p>
        </div>
      </motion.div>
    </section>
  );
}

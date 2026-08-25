'use client';

import { motion } from 'framer-motion';
import {
  Zap,
  Twitter,
  Linkedin,
  Youtube,
  Github,
} from 'lucide-react';
import { slideUp, staggerContainer, viewportOnce } from '@/lib/motion';

const COLUMNS = [
  {
    title: 'Product',
    links: ['Features', 'AI Agents', 'Dashboard', 'Pricing', 'Changelog'],
  },
  {
    title: 'Company',
    links: ['About', 'Blog', 'Careers', 'Customers', 'Brand'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'API Reference', 'Community', 'Templates', 'Status'],
  },
  {
    title: 'Legal',
    links: ['Privacy', 'Terms', 'Security', 'DPA', 'Cookies'],
  },
];

const SOCIALS = [
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
  { icon: Youtube, href: '#', label: 'YouTube' },
  { icon: Github, href: '#', label: 'GitHub' },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-black">
      {/* Top subtle line */}
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[700px] -translate-x-1/2 rounded-full bg-white/[0.02] blur-[120px]" />

      <motion.div
        variants={staggerContainer(0.08)}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="relative mx-auto max-w-7xl px-4 py-16"
      >
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          {/* Brand */}
          <motion.div variants={slideUp} className="col-span-2">
            <a href="#" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/10 shadow-sm">
                <Zap className="h-4 w-4 text-white" fill="white" />
              </div>
              <span className="text-base font-semibold text-white">
                WebinarFlow<span className="text-[#D6D6D6]">.AI</span>
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#B8B8B8]/60">
              The all-in-one AI platform to build, run, and scale webinar
              funnels that convert.
            </p>
            <div className="mt-6 flex gap-2.5">
              {SOCIALS.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#0A0A0A] text-[#B8B8B8] transition-colors hover:border-white/20 hover:text-white"
                >
                  <Icon className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <motion.div key={col.title} variants={slideUp}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#D6D6D6]">{col.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-[#B8B8B8]/60 transition-colors hover:text-white"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-[#B8B8B8]/40">
            © {new Date().getFullYear()} WebinarFlow AI, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-[#B8B8B8]/40">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400" />
            All systems operational
          </div>
        </div>
      </motion.div>
    </footer>
  );
}

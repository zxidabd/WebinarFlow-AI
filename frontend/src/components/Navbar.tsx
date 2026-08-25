'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Solutions', href: '#agents' },
  { label: 'Resources', href: '#dashboard' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Documentation', href: '#testimonials' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div
        className={cn(
          'mx-auto flex h-20 max-w-7xl items-center justify-between px-6 transition-all duration-300',
          scrolled &&
            'mt-2 h-16 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-2xl shadow-2xl shadow-black/90 md:mx-auto md:max-w-6xl',
        )}
      >
        {/* Logo */}
        <a href="#" className="group flex items-center gap-3">
          <div
            className="relative flex h-9 w-9 items-center justify-center rounded-xl shadow-lg border border-white/30 transition-transform group-hover:scale-105"
            style={{
              background:
                'linear-gradient(135deg, #6b6b6f 0%, #c8c8cc 20%, #ffffff 40%, #9a9a9e 60%, #d4d4d8 80%, #707074 100%)',
            }}
          >
            <Zap className="h-4 w-4 text-black fill-black" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            WebinarFlow<span className="text-[#D6D6D6]">.AI</span>
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/70 transition-colors duration-200 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-white/80 transition-colors duration-200 hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="group relative inline-flex h-9 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/[0.04] px-5 text-sm font-medium text-white shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-white/[0.08]"
          >
            <span className="relative z-10">Get Started</span>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-white/80 transition-colors hover:bg-white/10 md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-4 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/95 backdrop-blur-2xl md:hidden"
          >
            <div className="flex flex-col p-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex h-10 items-center justify-center rounded-xl border border-white/20 bg-white/[0.04] px-5 text-sm font-medium text-white shadow-sm transition-all hover:border-white/40"
              >
                Get Started
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

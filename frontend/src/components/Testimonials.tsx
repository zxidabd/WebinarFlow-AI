'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { slideUp, staggerContainer, viewportOnce } from '@/lib/motion';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'WebinarFlow AI replaced three SaaS tools for us. We launched a full funnel — page, script, emails — in an afternoon. Registrations doubled the first week.',
    name: 'Sarah Chen',
    role: 'Founder, Brightpath',
    initials: 'SC',
  },
  {
    quote:
      'The AI agents hand off like a real team. Our coaches just type the goal and the whole follow-up sequence is written and scheduled.',
    name: 'Marcus Rivera',
    role: 'Head of Growth, Lumen Agency',
    initials: 'MR',
  },
  {
    quote:
      'Attendance went from 41% to 77% after we switched on the WhatsApp reminders. The ROI was obvious within the first webinar.',
    name: 'Priya Nair',
    role: 'Creator & Coach',
    initials: 'PN',
  },
  {
    quote:
      'Finally, analytics that attribute revenue back to the funnel step. I can show my team exactly what moved the needle.',
    name: 'David Okafor',
    role: 'VP Marketing, Northpeak',
    initials: 'DO',
  },
  {
    quote:
      'We scaled from 2 webinars a month to 20 across six programs. The CRM keeps every deal stage clean and synced.',
    name: 'Elena Volkova',
    role: 'Operations Lead, ScaleUp',
    initials: 'EV',
  },
];

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = TESTIMONIALS.length;

  const advance = useRef(() => {});
  advance.current = () => setIndex((i) => (i + 1) % count);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => advance.current(), 4500);
    return () => clearInterval(id);
  }, [paused]);

  const active = TESTIMONIALS[index];

  return (
    <section
      id="testimonials"
      className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-24"
    >
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
          Testimonials
        </motion.span>
        <motion.h2
          variants={slideUp}
          className="mt-5 text-4xl font-semibold tracking-tight text-[#F5F5F5] sm:text-5xl"
        >
          Loved by <span className="text-gradient">creators, coaches & teams</span>
        </motion.h2>
      </motion.div>

      {/* Carousel */}
      <motion.div
        variants={slideUp}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
        className="relative mx-auto mt-14 max-w-3xl"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A] p-8 shadow-2xl shadow-black sm:p-12">
          <Quote className="absolute right-8 top-8 h-16 w-16 text-white/[0.03]" fill="currentColor" />

          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <div className="mb-5 flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-[#D6D6D6]" fill="currentColor" />
                ))}
              </div>
              <blockquote className="text-lg leading-relaxed text-[#F5F5F5] sm:text-xl font-normal">
                “{active.quote}”
              </blockquote>
              <div className="mt-8 flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-semibold text-white shadow-sm">
                  {active.initials}
                </div>
                <div>
                  <p className="font-semibold text-white">{active.name}</p>
                  <p className="text-sm text-[#B8B8B8]/60">{active.role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="mt-6 flex justify-center gap-2">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Show testimonial ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </motion.div>
    </section>
  );
}

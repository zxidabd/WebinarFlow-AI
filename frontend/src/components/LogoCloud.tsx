'use client';

import { motion } from 'framer-motion';
import {
  Rocket,
  Briefcase,
  GraduationCap,
  Video,
  Building2,
} from 'lucide-react';
import { slideUp, staggerContainer, viewportOnce } from '@/lib/motion';

const COMPANIES = [
  { name: 'Startup', icon: Rocket },
  { name: 'Agency', icon: Briefcase },
  { name: 'Coach', icon: GraduationCap },
  { name: 'Creator', icon: Video },
  { name: 'Enterprise', icon: Building2 },
];

export default function LogoCloud() {
  // Duplicate the list so the marquee can loop seamlessly (translateX -50%).
  const loop = [...COMPANIES, ...COMPANIES];

  return (
    <motion.section
      variants={staggerContainer(0.1)}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      className="relative mx-auto max-w-7xl px-4 py-16"
    >
      <motion.p
        variants={slideUp}
        className="text-center text-xs font-medium uppercase tracking-[0.3em] text-[#B8B8B8]/40"
      >
        Trusted by modern teams worldwide
      </motion.p>

      <motion.div
        variants={slideUp}
        className="group relative mt-10 overflow-hidden"
        style={{
          maskImage:
            'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}
      >
        <div className="flex w-max animate-marquee gap-16 pr-16 [--duration:32s] group-hover:[animation-play-state:paused]">
          {loop.map(({ name, icon: Icon }, i) => (
            <div
              key={`${name}-${i}`}
              className="flex items-center gap-3 text-[#B8B8B8]/30 transition-colors duration-300 hover:text-white"
            >
              <Icon className="h-6 w-6" strokeWidth={1.5} />
              <span className="text-lg font-medium tracking-tight">{name}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.section>
  );
}

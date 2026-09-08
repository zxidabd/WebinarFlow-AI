'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Wand2, MessageSquare, ArrowRight, X } from 'lucide-react';

export function FloatingAIAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // If already on the dedicated full-page AI Agent screen, do not show the floating assistant widget at all
  if (pathname?.startsWith('/dashboard/ai-agent')) {
    return null;
  }

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end pointer-events-none select-none">
      {/* Quick Launch Popover Card */}
      {isOpen && (
        <div className="pointer-events-auto mb-3 w-80 sm:w-88 rounded-2xl border border-border/80 bg-neutral-950/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/60 text-white animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden bg-black/40 border border-white/10 p-0.5 shadow-inner">
                <img
                  src="/ai-robot-clean.png"
                  alt="WebinarFlow AI+"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm tracking-wide text-white">
                    WebinarFlow <span className="text-[#f8a5b2] font-black">AI+</span>
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400">Next-gen autonomous AI co-pilot</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Actions List */}
          <div className="py-3 space-y-2 text-xs">
            <Link
              href="/dashboard/ai-agent?tab=funnel"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/20 hover:border-purple-500/40 text-neutral-200 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-purple-600/30 text-purple-300">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-white group-hover:text-purple-300">1-Click Funnel Generator</div>
                  <div className="text-[10px] text-neutral-400">Pages, emails & outline in seconds</div>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-neutral-400 group-hover:translate-x-0.5 group-hover:text-purple-300 transition-all" />
            </Link>

            <Link
              href="/dashboard/ai-agent?tab=chat"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-900/60 hover:bg-neutral-800/80 border border-neutral-800 hover:border-purple-500/30 text-neutral-200 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-neutral-800 text-purple-300">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-white group-hover:text-purple-300">Chat with AI Co-Pilot</div>
                  <div className="text-[10px] text-neutral-400">Ask copy, tech, and marketing questions</div>
                </div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-neutral-400 group-hover:translate-x-0.5 group-hover:text-purple-300 transition-all" />
            </Link>
          </div>

          <div className="pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online & Ready
            </span>
            <Link
              href="/dashboard/ai-agent"
              onClick={() => setIsOpen(false)}
              className="text-purple-400 hover:text-purple-300 font-semibold hover:underline"
            >
              Open Full Studio →
            </Link>
          </div>
        </div>
      )}

      {/* Floating Robot Sitting on the AI+ Button with Gently Swinging Legs */}
      <div className="pointer-events-auto group cursor-pointer">
        <motion.button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="relative block w-[115px] sm:w-[140px] md:w-[150px] aspect-[621/575] focus:outline-none transition-all drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)] hover:drop-shadow-[0_14px_32px_rgba(236,72,153,0.35)]"
          title="WebinarFlow AI+ Assistant — Click to open"
          aria-label="WebinarFlow AI+ Assistant"
        >
          {/* Stationary Layer: Robot Torso, Face, Head, Arms & AI+ Pill Button */}
          <img
            src="/ai-robot-body.png"
            alt="WebinarFlow AI+ Robot"
            className="w-full h-full object-contain pointer-events-none select-none"
          />

          {/* Left Leg: Gently swings forward and backward */}
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: `${(232 / 621) * 100}%`,
              top: `${(320 / 575) * 100}%`,
              width: `${(85 / 621) * 100}%`,
              height: `${(85 / 575) * 100}%`,
              transformOrigin: '50% 12%',
            }}
            animate={{
              rotate: [-8, 8, -8],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <img
              src="/leg-left.png"
              alt=""
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </motion.div>

          {/* Right Leg: Gently swings in alternating idle motion */}
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: `${(312 / 621) * 100}%`,
              top: `${(325 / 575) * 100}%`,
              width: `${(90 / 621) * 100}%`,
              height: `${(90 / 575) * 100}%`,
              transformOrigin: '50% 12%',
            }}
            animate={{
              rotate: [8, -8, 8],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <img
              src="/leg-right.png"
              alt=""
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </motion.div>
        </motion.button>
      </div>
    </div>
  );
}

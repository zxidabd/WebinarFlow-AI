'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Wand2, MessageSquare, ArrowRight, X } from 'lucide-react';

export function FloatingAIAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // If already on the dedicated full-page AI Agent screen or on public published webinar landing pages (/r/[slug]), do not show the floating assistant widget at all
  if (pathname?.startsWith('/dashboard/ai-agent') || pathname?.startsWith('/r/')) {
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
                  src="/ai-robot-clean.png?v=4"
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

      {/* Floating Robot Sitting on the AI+ Button */}
      <div className="pointer-events-auto group cursor-pointer">
        <motion.button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          whileHover={{ scale: 1.06, y: -2 }}
          whileTap={{ scale: 0.94 }}
          animate={{ y: [0, -5, 0] }}
          transition={{
            y: { duration: 2.8, repeat: Infinity, ease: 'easeInOut' },
            scale: { type: 'spring', stiffness: 400, damping: 25 },
          }}
          className="relative block w-[98px] sm:w-[118px] md:w-[126px] aspect-[1024/682] focus:outline-none transition-transform drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
          title="WebinarFlow AI+ Assistant — Click to open"
          aria-label="WebinarFlow AI+ Assistant"
        >
          <img
            src="/ai-robot-clean.png?v=5"
            alt="WebinarFlow AI+ Assistant"
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        </motion.button>
      </div>
    </div>
  );
}

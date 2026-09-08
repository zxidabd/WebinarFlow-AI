'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Wand2, MessageSquare, ArrowRight, X } from 'lucide-react';

export function FloatingAIAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // If already on the dedicated full-page AI Agent screen, do not show the floating assistant widget at all
  if (pathname?.startsWith('/dashboard/ai-agent')) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none select-none">
      {/* Quick Launch Popover Card */}
      {isOpen && (
        <div className="pointer-events-auto mb-3 w-80 sm:w-88 rounded-2xl border border-purple-500/30 bg-neutral-950/95 backdrop-blur-xl p-4 shadow-2xl shadow-purple-950/50 text-white animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-purple-500/20">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full overflow-hidden shadow-md bg-white border border-neutral-700/60 p-0.5">
                <img
                  src="/logo.png"
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
              href="/dashboard/ai-agent"
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
              href="/dashboard/ai-agent"
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

      {/* Floating Button with Spiral WF Emblem & Larger 'AI+' Badge */}
      <div className="pointer-events-auto flex items-center gap-3 group cursor-pointer">
        {/* Floating pill badge - enlarged */}
        <Link
          href="/dashboard/ai-agent"
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-950/95 text-white border border-neutral-700/80 hover:border-neutral-500 shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-105"
        >
          <Sparkles className="h-4 w-4 text-[#f8a5b2] animate-pulse shrink-0" />
          <span className="text-sm sm:text-base font-black tracking-wide text-white">
            AI+
          </span>
        </Link>

        {/* Floating Spiral WF Emblem Button */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-full transition-transform duration-300 active:scale-95 group-hover:scale-110 focus:outline-none"
          title="WebinarFlow AI+"
          aria-label="WebinarFlow AI+"
        >
          {/* Subtle elegant aura */}
          <div className="absolute inset-0 rounded-full bg-black/20 dark:bg-white/15 blur-md" />
          <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-[#852533]/40 to-neutral-400/40 opacity-70 blur-sm" />
          
          {/* Circular Emblem Frame with Spiral WF Logo */}
          <div className="relative h-full w-full rounded-full p-1.5 overflow-hidden ring-2 ring-neutral-300/80 dark:ring-neutral-700/90 shadow-2xl bg-white flex items-center justify-center">
            <img
              src="/logo.png"
              alt="WebinarFlow AI+"
              className="h-full w-full object-contain rounded-full"
            />
          </div>
        </button>
      </div>
    </div>
  );
}

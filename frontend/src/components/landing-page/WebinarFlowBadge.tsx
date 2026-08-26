'use client';

export default function WebinarFlowBadge() {
  return (
    <aside aria-label="WebinarFlow-AI Attribution" className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50 pointer-events-auto select-none print:hidden">
      <a
        href="https://webinar-flow-ai-frontend.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        title="Made with WebinarFlow-AI — AI-Powered Webinar Platform"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900/90 hover:bg-black text-neutral-300 hover:text-white border border-neutral-700/70 hover:border-neutral-500 shadow-md shadow-black/25 backdrop-blur-md text-[11px] font-medium tracking-tight transition-all duration-200 hover:scale-[1.03] group active:scale-[0.98]"
      >
        <svg
          className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300 transition-colors shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
        <span className="text-neutral-400 font-normal">Made with</span>
        <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
          WebinarFlow-AI
        </span>
      </a>
    </aside>
  );
}

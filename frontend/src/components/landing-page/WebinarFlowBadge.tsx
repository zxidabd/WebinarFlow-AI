'use client';

export default function WebinarFlowBadge() {
  return (
    <aside aria-label="WebinarFlow-AI Attribution" className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50 pointer-events-auto select-none print:hidden">
      <a
        href="https://webinarflow.in"
        target="_blank"
        rel="noopener noreferrer"
        title="Made with WebinarFlow-AI — AI-Powered Webinar Platform"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900/90 hover:bg-black text-neutral-300 hover:text-white border border-neutral-700/70 hover:border-neutral-500 shadow-md shadow-black/25 backdrop-blur-md text-[11px] font-medium tracking-tight transition-all duration-200 hover:scale-[1.03] group active:scale-[0.98]"
      >
        <img
          src="/logo.png"
          alt="WebinarFlow.AI"
          className="w-4 h-4 rounded-full object-contain shrink-0 bg-white p-0.5 shadow-sm"
        />
        <span className="text-neutral-400 font-normal">Made with</span>
        <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
          WebinarFlow-AI
        </span>
      </a>
    </aside>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';

/**
 * Signed-in dashboard shell. Respects light/dark theme from next-themes.
 * Gated by RequireAuth — an unauthenticated visitor is redirected to /login.
 * 
 * For /dashboard/ai-agent, renders an edge-to-edge full-page ChatGPT layout
 * without outer scrolling or standard dashboard chrome.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAiAgent = pathname?.startsWith('/dashboard/ai-agent');

  if (isAiAgent) {
    return (
      <RequireAuth>
        <div className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-background text-foreground dark:bg-[#0b0305] dark:text-white transition-colors">
          {children}
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="min-h-screen bg-background text-foreground">
        {/* Sidebar: fixed on desktop, hidden on mobile (topbar toggles it) */}
        <div className="fixed inset-y-0 left-0 z-30 hidden w-60 md:block">
          <DashboardSidebar />
        </div>

        <div className="flex min-h-screen flex-col md:pl-60">
          <DashboardTopbar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}

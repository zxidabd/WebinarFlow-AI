'use client';

import { usePathname } from 'next/navigation';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { TrialExpiredPaywall } from '@/components/auth/TrialExpiredPaywall';
import { useAuthStore } from '@/store/auth';

/**
 * Signed-in dashboard shell. Respects light/dark theme from next-themes.
 * Gated by RequireAuth — an unauthenticated visitor is redirected to /login.
 *
 * Shows a trial banner during the trial period.
 * Shows a full-screen paywall when the trial expires and the user hasn't paid.
 *
 * For /dashboard/ai-agent, renders an edge-to-edge full-page ChatGPT layout
 * without outer scrolling or standard dashboard chrome.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAiAgent = pathname?.startsWith('/dashboard/ai-agent');
  const user = useAuthStore((s) => s.user);

  // Check if trial/subscription has expired or been canceled (superusers bypass)
  const isTrialExpired =
    user &&
    !user.is_super_user &&
    (user.subscription_status === 'expired' ||
      user.subscription_status === 'canceled' ||
      (user.subscription_status !== 'active' &&
        user.trial_ends_at &&
        new Date(user.trial_ends_at) < new Date()));

  // Calculate days remaining in trial
  const trialDaysLeft =
    user?.subscription_status === 'trialing' && user?.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / 86400000))
      : null;

  // Trial banner component
  const TrialBanner = trialDaysLeft !== null && trialDaysLeft > 0 && !isTrialExpired ? (
    <div className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 text-white text-center py-1.5 px-4 text-sm font-medium">
      ⏱️ Free Trial: {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
      <span className="mx-2">|</span>
      <a href="/dashboard/billing" className="underline underline-offset-2 hover:text-white/90 font-semibold">
        Upgrade Now →
      </a>
    </div>
  ) : null;

  if (isTrialExpired && pathname !== '/dashboard/billing') {
    return (
      <RequireAuth>
        <TrialExpiredPaywall />
      </RequireAuth>
    );
  }

  if (isAiAgent) {
    return (
      <RequireAuth>
        {TrialBanner}
        <div className={`fixed ${TrialBanner ? 'top-[36px]' : 'top-0'} inset-x-0 bottom-0 w-full overflow-hidden bg-background text-foreground dark:bg-[#0b0305] dark:text-white transition-colors`}>
          {children}
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="min-h-screen bg-background text-foreground">
        {TrialBanner}
        {/* Sidebar: fixed on desktop, hidden on mobile (topbar toggles it) */}
        <div className={`fixed ${TrialBanner ? 'top-[36px]' : 'top-0'} bottom-0 left-0 z-30 hidden w-60 md:block`}>
          <DashboardSidebar />
        </div>

        <div className={`flex min-h-screen flex-col md:pl-60 ${TrialBanner ? 'pt-0' : ''}`}>
          <DashboardTopbar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}

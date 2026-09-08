/**
 * Authenticated top bar (light SaaS theme) — logo, active organization, a mobile
 * sidebar toggle, and the user menu with logout. Rendered inside .dashboard-light,
 * so it uses the light shadcn vars; on mobile it toggles the sidebar drawer.
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LogOut, Menu, X, Zap, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';

function TrialTimerBadge({ trialEndsAt }: { trialEndsAt: string }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    function update() {
      const now = new Date().getTime();
      const end = new Date(trialEndsAt).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft({ days, hours, minutes });
    }

    update();
    const interval = setInterval(update, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [trialEndsAt]);

  if (!timeLeft) return null;

  return (
    <Link
      href="/dashboard/settings"
      className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400 transition-all shadow-sm"
      title="Click to upgrade"
    >
      <Clock className="h-3.5 w-3.5 animate-pulse text-amber-500" />
      <span>
        {timeLeft.days > 0 ? (
          <>
            <strong>{timeLeft.days}d {timeLeft.hours}h</strong> left
          </>
        ) : (
          <>
            <strong>{timeLeft.hours}h {timeLeft.minutes}m</strong> left
          </>
        )}
      </span>
      <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-wider bg-amber-500 text-white dark:text-black px-1.5 py-0.2 rounded-full">
        Upgrade
      </span>
    </Link>
  );
}

function initials(nameOrEmail: string): string {
  const source = nameOrEmail.trim();
  if (!source) return '?';
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function DashboardTopbar() {
  const pathname = usePathname();
  const { user, organization, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  const displayName = user?.full_name || user?.email || '';

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <Link href="/dashboard" className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="WebinarFlow.AI"
                className="h-8 w-8 rounded-lg object-contain bg-white shadow-sm border border-border/40"
              />
              <span className="text-base font-semibold tracking-tight text-foreground">
                WebinarFlow<span className="text-[#852533] dark:text-[#f8a5b2] font-bold">.AI</span>
              </span>
            </Link>
            {organization && (
              <span className="hidden rounded-md border border-border bg-muted/60 px-2.5 py-0.5 text-xs font-mono text-muted-foreground sm:inline">
                {organization.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Free Trial Countdown Badge */}
            {user?.subscription_status === 'trialing' && user?.trial_ends_at && (
              <TrialTimerBadge trialEndsAt={user.trial_ends_at} />
            )}

            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#852533] text-xs font-semibold text-white shadow-sm shadow-[#852533]/20">
                {initials(displayName)}
              </div>
              <span className="max-w-[160px] truncate text-sm font-medium text-foreground">{displayName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      <div
        className={cn(
          'fixed inset-0 z-20 md:hidden',
          mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!mobileNavOpen}
      >
        <div
          className={cn(
            'absolute inset-0 bg-black/40 transition-opacity',
            mobileNavOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setMobileNavOpen(false)}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-60 max-w-[80%] shadow-2xl transition-transform',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          onClick={() => setMobileNavOpen(false)}
        >
          <DashboardSidebar />
        </div>
      </div>
    </>
  );
}

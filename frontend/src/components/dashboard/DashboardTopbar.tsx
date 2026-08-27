/**
 * Authenticated top bar (light SaaS theme) — logo, active organization, a mobile
 * sidebar toggle, and the user menu with logout. Rendered inside .dashboard-light,
 * so it uses the light shadcn vars; on mobile it toggles the sidebar drawer.
 */
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LogOut, Menu, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';

function initials(nameOrEmail: string): string {
  const source = nameOrEmail.trim();
  if (!source) return '?';
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function DashboardTopbar() {
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
                className="h-8 w-8 rounded-lg object-contain bg-black shadow-sm"
              />
              <span className="text-base font-semibold tracking-tight text-neutral-900">
                WebinarFlow<span className="text-[#45141B] font-bold">.AI</span>
              </span>
            </Link>
            {organization && (
              <span className="hidden rounded-md border border-[#45141B]/20 bg-[#45141B]/5 px-2.5 py-0.5 text-xs font-mono text-[#45141B] sm:inline">
                {organization.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2.5 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#45141B] text-xs font-semibold text-white shadow-sm shadow-[#45141B]/20">
                {initials(displayName)}
              </div>
              <span className="max-w-[160px] truncate text-sm font-medium text-neutral-800">{displayName}</span>
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

/**
 * Dashboard sidebar (light/blue SaaS theme). Rendered inside the .dashboard-light
 * shell so it picks up the light shadcn vars from globals.css — not the dark-glass
 * look used on the marketing site and auth pages.
 *
 * Ordered per the finalized Phase 2 design:
 * Dashboard, Analytics, Customers, Webinars, Payments, AI Agent, Settings.
 *
 * "AI Agent" is NOT a separate page (ONE AI experience). It links to
 * /dashboard#ai-hero, which the Overview page exposes as the dominant hero panel,
 * and the CTA there opens the funnel wizard.
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Video,
  CreditCard,
  Sparkles,
  Settings,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Match the nav item's "section" rather than the exact href when true. */
  matchPrefix?: string;
  /** AI Agent links to the on-page hero anchor instead of a route. */
  isHeroAnchor?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, matchPrefix: '/dashboard/analytics' },
  { label: 'Customers', href: '/dashboard/customers', icon: Users, matchPrefix: '/dashboard/customers' },
  { label: 'Webinars', href: '/dashboard/webinars', icon: Video, matchPrefix: '/dashboard/webinars' },
  { label: 'Payments', href: '/dashboard/payments', icon: CreditCard, matchPrefix: '/dashboard/payments' },
  { label: 'AI Agent', href: '/dashboard#ai-hero', icon: Sparkles, isHeroAnchor: true },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings, matchPrefix: '/dashboard/settings' },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const basePath = pathname?.split('#')[0] ?? '/dashboard';

  const isActive = (item: NavItem): boolean => {
    if (item.isHeroAnchor) return false;
    if (item.matchPrefix) return basePath.startsWith(item.matchPrefix);
    return basePath === item.href;
  };

  return (
    <aside className="flex h-full w-60 flex-col border-r border-neutral-200 bg-white">
      <Link href="/dashboard" className="flex h-16 items-center gap-2.5 px-6 border-b border-neutral-100">
        <img
          src="/logo.png"
          alt="WebinarFlow.AI"
          className="h-8 w-8 rounded-lg object-contain bg-black shadow-sm"
        />
        <span className="text-base font-semibold tracking-tight text-neutral-900">
          WebinarFlow<span className="text-[#45141B] font-bold">.AI</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-[#45141B] text-white font-semibold shadow-sm shadow-[#45141B]/25'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                item.isHeroAnchor && !active && 'text-[#7a222e] font-semibold hover:bg-[#45141B]/5',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0 transition-colors duration-150', active ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-900')} />
              <span>{item.label}</span>
              {active && (
                <span className="absolute right-3 h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 text-xs text-muted-foreground/70">
        <p className="px-2 font-medium">Phase 2 — AI Funnel Workspace</p>
      </div>
    </aside>
  );
}

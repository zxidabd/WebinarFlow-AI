/**
 * Analytics overview — the 7 KPI cards specified for the Phase 2 dashboard.
 * Each reads from the shared Registrant / timeline data layer; in Phase 2 the
 * source data is absent, so cards render 0 and are captioned with the phase that
 * will populate them. These are real cards — Phases 3/4/5 add rows, not redesign.
 */
'use client';

import { Users, UserPlus, ClipboardCheck, UserCheck, ShoppingCart, DollarSign, TrendingUp, ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

type Metric = {
  label: string;
  value: number;
  icon: LucideIcon;
  futurePhase: string;
  format?: (n: number) => string;
};

const formatUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const formatPercent = (n: number) => `${(n * 100).toFixed(1)}%`;

const METRICS: Metric[] = [
  { label: 'Total Visitors', value: 0, icon: Users, futurePhase: 'Phase 3' },
  { label: 'Total Leads', value: 0, icon: UserPlus, futurePhase: 'Phase 3' },
  { label: 'Total Registrations', value: 0, icon: ClipboardCheck, futurePhase: 'Phase 2' },
  { label: 'Webinar Attendees', value: 0, icon: UserCheck, futurePhase: 'Phase 2' },
  { label: 'Total Sales', value: 0, icon: ShoppingCart, futurePhase: 'Phase 5' },
  { label: 'Revenue', value: 0, icon: DollarSign, futurePhase: 'Phase 5', format: formatUSD },
  { label: 'Conversion Rate', value: 0, icon: TrendingUp, futurePhase: 'Phase 5', format: formatPercent },
];

export function AnalyticsOverview() {
  return (
    <section aria-label="Analytics">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Analytics</h2>
        <Link href="/dashboard/analytics" className="text-xs font-medium text-[#7a222e] hover:text-[#45141B] flex items-center gap-1 transition-colors">
          Overview <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map(({ label, value, icon: Icon, futurePhase, format }) => (
          <Card key={label} className="group border-border/80 bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#7a222e]/30 hover:shadow-lg hover:shadow-[#45141B]/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#45141B]/10 text-[#7a222e] border border-[#45141B]/15 transition-all duration-200 group-hover:scale-110 group-hover:bg-[#45141B]/20">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight text-foreground">
                {format ? format(value) : value.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-muted-foreground/70">{futurePhase}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

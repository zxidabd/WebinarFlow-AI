/**
 * Customers section of the Overview. Backed by the shared Registrant / timeline
 * data layer. Sub-panels per the Phase 2 design:
 *   - Recent Leads
 *   - Recent Registrations
 *   - Recent Buyers  (gated to Phase 5; shown as locked/empty now)
 *   - Customer Activity Timeline
 * Empty placeholders in Phase 2 (no source data yet); the UI is real and does
 * not get redesigned when Phases 3/4/5 add rows.
 */
'use client';

import { UserPlus, ClipboardCheck, ShoppingBag, Activity, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Panel = {
  title: string;
  icon: LucideIcon;
  /** Phase that backfills this panel with real rows. */
  phase: string;
  locked?: boolean;
};

const PANELS: Panel[] = [
  { title: 'Recent Leads', icon: UserPlus, phase: 'Phase 3' },
  { title: 'Recent Registrations', icon: ClipboardCheck, phase: 'Phase 2' },
  { title: 'Recent Buyers', icon: ShoppingBag, phase: 'Phase 5', locked: true },
];

function EmptyRow({ locked, phase }: { locked?: boolean; phase: string }) {
  return (
    <li className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-muted-foreground">
      <span>No records yet</span>
      <span className="text-xs">{locked ? `Locked · ${phase}` : phase}</span>
    </li>
  );
}

export function CustomersSection() {
  return (
    <section aria-label="Customers">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">Customers</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {PANELS.map(({ title, icon: Icon, phase, locked }) => (
          <Card key={title} className="group border-white/10 bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-emerald/30 hover:shadow-lg hover:shadow-brand-emerald/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-emerald/10 text-brand-emerald-light border border-brand-emerald/20 transition-transform duration-200 group-hover:scale-105">
                  <Icon className="h-4 w-4" />
                </span>
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                <EmptyRow locked={locked} phase={phase} />
              </ul>
            </CardContent>
          </Card>
        ))}

        {/* Activity timeline — full width on its own row */}
        <Card className="group border-white/10 bg-card/60 backdrop-blur-xl shadow-sm lg:col-span-1 lg:row-start-1 lg:row-end-1 transition-all duration-200 hover:-translate-y-1 hover:border-brand-emerald/30 hover:shadow-lg hover:shadow-brand-emerald/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-emerald/10 text-brand-emerald-light border border-brand-emerald/20 transition-transform duration-200 group-hover:scale-105">
                <Activity className="h-4 w-4" />
              </span>
              Customer Activity Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              <EmptyRow phase="Phase 3" />
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

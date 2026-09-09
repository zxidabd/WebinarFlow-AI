'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  UserPlus,
  ClipboardCheck,
  ShoppingBag,
  Activity,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listRegistrations } from '@/lib/webinar-api';

export function CustomersSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-customers-overview'],
    queryFn: () => listRegistrations({ limit: 10 }),
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    staleTime: 4000,
  });

  const items = data?.items || [];
  const recentActivities = data?.recentActivities || [];

  // Derived panels
  const recentLeads = items.slice(0, 4);
  const recentRegistrations = items.filter((i) => i.webinarTitle).slice(0, 4);
  const recentBuyers = items.filter((i) => i.status === 'Purchased' || i.totalSpent > 0).slice(0, 4);

  return (
    <section aria-label="Customers">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Customers & Contacts</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
        <Link
          href="/dashboard/customers"
          className="text-xs font-medium text-[#852533] dark:text-[#f8a5b2] hover:underline flex items-center gap-1 transition-colors"
        >
          View All ({data?.totalLeads ?? items.length}) <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* 1. Recent Leads */}
        <Card className="group border-border/80 bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#7a222e]/30 hover:shadow-lg hover:shadow-[#45141B]/5">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-foreground">
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  <UserPlus className="h-4 w-4" />
                </span>
                Recent Leads
              </span>
              <span className="text-xs font-normal text-muted-foreground">{recentLeads.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoading ? (
              <div className="py-6 flex items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Loading leads...
              </div>
            ) : recentLeads.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <p className="font-medium text-foreground/80">No leads yet</p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">Opt-ins appear here live</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {recentLeads.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold">
                        {(lead.name || lead.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="font-medium text-foreground truncate">{lead.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{lead.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{lead.dateJoined}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 2. Recent Registrations */}
        <Card className="group border-border/80 bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#7a222e]/30 hover:shadow-lg hover:shadow-[#45141B]/5">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-foreground">
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <ClipboardCheck className="h-4 w-4" />
                </span>
                Registrations
              </span>
              <span className="text-xs font-normal text-muted-foreground">{recentRegistrations.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoading ? (
              <div className="py-6 flex items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Loading...
              </div>
            ) : recentRegistrations.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <p className="font-medium text-foreground/80">No registrations yet</p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">Signups appear here live</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {recentRegistrations.map((reg) => (
                  <li key={reg.id} className="flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-foreground truncate">{reg.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{reg.webinarTitle}</p>
                    </div>
                    <span className="inline-flex items-center rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-500 shrink-0">
                      {reg.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 3. Recent Buyers */}
        <Card className="group border-border/80 bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#7a222e]/30 hover:shadow-lg hover:shadow-[#45141B]/5">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-foreground">
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <ShoppingBag className="h-4 w-4" />
                </span>
                Recent Buyers
              </span>
              <span className="text-xs font-normal text-muted-foreground">{recentBuyers.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoading ? (
              <div className="py-6 flex items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Loading buyers...
              </div>
            ) : recentBuyers.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <p className="font-medium text-foreground/80">No buyers yet</p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">Sales appear here live</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {recentBuyers.map((b) => (
                  <li key={b.id} className="flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-foreground truncate">{b.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{b.webinarTitle}</p>
                    </div>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                      +${b.totalSpent.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 4. Customer Activity Timeline */}
        <Card className="group border-border/80 bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#7a222e]/30 hover:shadow-lg hover:shadow-[#45141B]/5">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="flex items-center justify-between text-sm font-semibold text-foreground">
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  <Activity className="h-4 w-4" />
                </span>
                Activity Timeline
              </span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Live stream" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {isLoading ? (
              <div className="py-6 flex items-center justify-center text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Loading feed...
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <p className="font-medium text-foreground/80">No activity yet</p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">Live actions stream here</p>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {recentActivities.slice(0, 4).map((act) => (
                  <li key={act.id} className="flex items-center gap-2 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                    <div className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-foreground">{act.userName}</span>{' '}
                      <span className="text-muted-foreground">
                        {act.type === 'purchased' ? 'bought ticket' : act.type === 'attended' ? 'attended' : 'joined'}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{act.time.split(' ')[0]}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

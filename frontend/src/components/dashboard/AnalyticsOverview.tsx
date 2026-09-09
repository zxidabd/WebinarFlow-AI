'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, UserPlus, ClipboardCheck, UserCheck, ShoppingCart, DollarSign, TrendingUp, ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { getAnalyticsOverview } from '@/lib/webinar-api';

const formatUSD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const formatPercent = (n: number) => `${(n * 100).toFixed(1)}%`;

export function AnalyticsOverview() {
  const { data } = useQuery({
    queryKey: ['analytics-overview-cards'],
    queryFn: () => getAnalyticsOverview('30d'),
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const totalViews = data?.total_views ?? 0;
  const totalRegistrations = data?.total_registrations ?? 0;
  const attendanceRate = data?.attendance_rate ? data.attendance_rate / 100 : 0;
  const totalSales = data?.total_sales ?? (data?.total_revenue && data.total_revenue > 0 ? 1 : 0);
  const totalRevenue = data?.total_revenue ?? 0;

  const metrics = [
    { label: 'Total Visitors', value: totalViews, icon: Users, desc: 'Live page traffic' },
    { label: 'Total Leads', value: totalRegistrations, icon: UserPlus, desc: 'Opt-in contacts' },
    { label: 'Total Registrations', value: totalRegistrations, icon: ClipboardCheck, desc: 'Webinar registrants' },
    { label: 'Attendance Rate', value: attendanceRate, icon: UserCheck, desc: 'Live attendee rate', format: formatPercent },
    { label: 'Total Sales', value: totalSales, icon: ShoppingCart, desc: 'Paid conversions' },
    { label: 'Revenue', value: totalRevenue, icon: DollarSign, desc: 'Gross revenue', format: formatUSD },
  ];

  return (
    <section aria-label="Analytics">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Analytics</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
        <Link href="/dashboard/analytics" className="text-xs font-medium text-[#852533] dark:text-[#f8a5b2] hover:underline flex items-center gap-1 transition-colors">
          Overview <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon, desc, format }) => (
          <Card key={label} className="group border-border/80 bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#7a222e]/30 hover:shadow-lg hover:shadow-[#45141B]/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#852533]/10 dark:bg-[#f8a5b2]/10 text-[#852533] dark:text-[#f8a5b2] border border-[#852533]/20 dark:border-[#f8a5b2]/20 transition-all duration-200 group-hover:scale-110 group-hover:bg-[#852533]/20">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight text-foreground">
                {format ? format(value) : value.toLocaleString()}
              </div>
              <p className="mt-1 text-xs text-muted-foreground/70">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

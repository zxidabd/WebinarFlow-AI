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
    refetchInterval: 10000,
  });

  const totalViews = data?.total_views ?? 0;
  const totalRegistrations = data?.total_registrations ?? 0;
  const attendanceRate = data?.attendance_rate ? data.attendance_rate / 100 : 0;
  const totalRevenue = data?.total_revenue ?? 0;

  const metrics = [
    { label: 'Total Visitors', value: totalViews, icon: Users, desc: 'Live page traffic' },
    { label: 'Total Leads', value: totalRegistrations, icon: UserPlus, desc: 'Opt-in contacts' },
    { label: 'Total Registrations', value: totalRegistrations, icon: ClipboardCheck, desc: 'Webinar registrants' },
    { label: 'Attendance Rate', value: attendanceRate, icon: UserCheck, desc: 'Live attendee rate', format: formatPercent },
    { label: 'Total Sales', value: totalRevenue > 0 ? 1 : 0, icon: ShoppingCart, desc: 'Paid conversions' },
    { label: 'Revenue', value: totalRevenue, icon: DollarSign, desc: 'Gross revenue', format: formatUSD },
  ];

  return (
    <section aria-label="Analytics">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Analytics</h2>
        <Link href="/dashboard/analytics" className="text-xs font-medium text-[#7a222e] hover:text-[#45141B] flex items-center gap-1 transition-colors">
          Overview <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon, desc, format }) => (
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
              <p className="mt-1 text-xs text-muted-foreground/70">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

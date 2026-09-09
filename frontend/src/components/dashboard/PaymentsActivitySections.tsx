/**
 * Payments + Recent Activity tail of the Overview.
 *
 * Payments: Shows real payment stats and recent transactions.
 * Uses Stripe checkout for paid webinars.
 */
'use client';

import { useEffect, useState } from 'react';
import { CreditCard, DollarSign, TrendingUp, AlertCircle, RefreshCw, Activity, UserPlus, ShoppingBag, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { getPaymentStats, type PaymentStats } from '@/lib/payment-api';
import { listRegistrations } from '@/lib/webinar-api';

export function PaymentsSection() {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadStats(isFirst = false) {
      try {
        if (isFirst) setLoading(true);
        const data = await getPaymentStats();
        if (isMounted) {
          setStats(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted && isFirst) {
          console.error('Failed to load payment stats:', err);
          setError('Unable to load payment data');
        }
      } finally {
        if (isMounted && isFirst) setLoading(false);
      }
    }
    loadStats(true);
    const interval = setInterval(() => loadStats(false), 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const formatCurrency = (amount: string, currency: string) => {
    const value = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(value);
  };

  return (
    <section aria-label="Payments">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">Payments</h2>

      {loading ? (
        <Card className="border-border shadow-sm">
          <CardContent className="py-8 text-center text-muted-foreground">
            <RefreshCw className="h-5 w-5 mx-auto mb-2 animate-spin" />
            Loading payment data...
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-border shadow-sm">
          <CardContent className="py-8 text-center text-destructive">
            <AlertCircle className="h-5 w-5 mx-auto mb-2" />
            {error}
          </CardContent>
        </Card>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Revenue */}
          <Card className="group border-white/10 bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-emerald/30 hover:shadow-lg hover:shadow-brand-emerald/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-emerald/10 text-brand-emerald-light border border-brand-emerald/20 transition-transform duration-200 group-hover:scale-105">
                  <DollarSign className="h-4 w-4" />
                </span>
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.total_revenue, stats.currency)}
              </p>
            </CardContent>
          </Card>

          {/* Completed Payments */}
          <Card className="group border-white/10 bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-emerald/30 hover:shadow-lg hover:shadow-brand-emerald/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-emerald/10 text-brand-emerald-light border border-brand-emerald/20 transition-transform duration-200 group-hover:scale-105">
                  <TrendingUp className="h-4 w-4" />
                </span>
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{stats.completed_payments}</p>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card className="group border-white/10 bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-emerald/30 hover:shadow-lg hover:shadow-brand-emerald/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-emerald/10 text-brand-emerald-light border border-brand-emerald/20 transition-transform duration-200 group-hover:scale-105">
                  <CreditCard className="h-4 w-4" />
                </span>
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{stats.pending_payments}</p>
            </CardContent>
          </Card>

          {/* Refunded */}
          <Card className="group border-white/10 bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-emerald/30 hover:shadow-lg hover:shadow-brand-emerald/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-emerald/10 text-brand-emerald-light border border-brand-emerald/20 transition-transform duration-200 group-hover:scale-105">
                  <CreditCard className="h-4 w-4" />
                </span>
                Refunded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(stats.refunded_amount, stats.currency)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Stripe setup hint */}
      {!loading && stats?.total_payments === 0 && (
        <Card className="mt-4 border-dashed border-white/15 bg-card/40 backdrop-blur-xl">
          <CardContent className="py-6 text-center text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm">No payments yet</p>
            <p className="text-xs mt-1">
              Add a price to your webinars and share the registration link to start accepting payments.
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

export function RecentActivitySection() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-customers-overview'],
    queryFn: () => listRegistrations({ limit: 10 }),
    placeholderData: (previousData) => previousData,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  const recentActivities = data?.recentActivities || [];

  return (
    <section aria-label="Recent Activity">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl font-bold tracking-tight text-foreground">Recent Activity</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Stream
          </span>
        </div>
      </div>
      <Card className="group border-border/80 bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#7a222e]/30 hover:shadow-lg hover:shadow-[#45141B]/5">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Activity className="h-4 w-4" />
            </span>
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="py-6 flex items-center justify-center text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Loading activity...
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="rounded-lg py-6 text-center text-xs text-muted-foreground">
              <p className="font-medium text-foreground/80">No activity yet</p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                Landing page views, registrations, and completed payments will stream here live.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {recentActivities.map((act) => (
                <li key={act.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        act.type === 'purchased'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-indigo-500/10 text-indigo-500'
                      }`}
                    >
                      {act.type === 'purchased' ? <ShoppingBag className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                    </span>
                    <div className="truncate">
                      <p className="font-medium text-foreground truncate">
                        {act.userName}{' '}
                        <span className="font-normal text-muted-foreground">
                          {act.type === 'purchased'
                            ? `purchased ticket for ${act.webinarTitle}`
                            : `registered for ${act.webinarTitle}`}
                        </span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">{act.userEmail}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{act.time}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

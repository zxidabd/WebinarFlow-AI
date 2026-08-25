/**
 * Payments + Recent Activity tail of the Overview.
 *
 * Payments: Shows real payment stats and recent transactions.
 * Uses Stripe checkout for paid webinars.
 */
'use client';

import { useEffect, useState } from 'react';
import { CreditCard, DollarSign, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPaymentStats, type PaymentStats } from '@/lib/payment-api';

export function PaymentsSection() {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        const data = await getPaymentStats();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Failed to load payment stats:', err);
        setError('Unable to load payment data');
      } finally {
        setLoading(false);
      }
    }
    loadStats();
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
  return (
    <section aria-label="Recent Activity">
      <h2 className="mb-4 text-lg font-semibold tracking-tight text-foreground">Recent Activity</h2>
      <Card className="group border-white/10 bg-card/60 backdrop-blur-xl shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-brand-emerald/30 hover:shadow-lg hover:shadow-brand-emerald/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-emerald/10 text-brand-emerald-light border border-brand-emerald/20 transition-transform duration-200 group-hover:scale-105">
              <RefreshCw className="h-4 w-4" />
            </span>
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground">
            No activity yet <span className="text-xs">· Registrations and payments will appear here</span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

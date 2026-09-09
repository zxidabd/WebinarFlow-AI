'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Shield,
  Clock,
  CreditCard,
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  DollarSign,
  TrendingUp,
  Wallet,
  Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_super_user: boolean;
  email_verified: boolean;
  subscription_status: string;
  plan_tier: string;
  trial_ends_at: string | null;
  created_at: string | null;
  last_login_at: string | null;
}

interface AdminStats {
  total: number;
  active: number;
  trialing: number;
  expired: number;
}

interface SubPayment {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  plan_tier: string;
  billing_cycle: string;
  amount: number;
  currency: string;
  provider: string;
  provider_txn_id: string | null;
  provider_order_id: string | null;
  status: string;
  created_at: string | null;
}

interface SubPaymentStats {
  total_revenue: number;
  total_revenue_inr?: number;
  total_revenue_usd?: number;
  total_payments: number;
  stripe_revenue: number;
  razorpay_revenue: number;
  starter_revenue: number;
  pro_revenue: number;
  starter_revenue_inr?: number;
  starter_revenue_usd?: number;
  pro_revenue_inr?: number;
  pro_revenue_usd?: number;
  stripe_count: number;
  razorpay_count: number;
  starter_count: number;
  pro_count: number;
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [subPayments, setSubPayments] = useState<SubPayment[]>([]);
  const [subPaymentStats, setSubPaymentStats] = useState<SubPaymentStats | null>(null);
  const [subPaymentSearch, setSubPaymentSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const currentUser = useAuthStore((s) => s.user);

  const loadData = async (search = '') => {
    try {
      setLoading(true);
      const res = await api.get(`/auth/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setUsers(res.data.users);
      setStats(res.data.stats);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Failed to load admin data';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const loadSubPayments = async (search = '', provider = '', plan = '') => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (provider) params.set('provider_filter', provider);
      if (plan) params.set('plan_filter', plan);
      const qs = params.toString();
      const res = await api.get(`/auth/admin/subscription-payments${qs ? `?${qs}` : ''}`);
      setSubPayments(res.data.payments);
      setSubPaymentStats(res.data.stats);
    } catch {
      // Silently fail if endpoint not yet deployed
    }
  };

  useEffect(() => {
    loadData();
    loadSubPayments();
  }, []);

  const handleSearch = () => {
    loadData(searchQuery);
  };

  const handleSubPaymentSearch = () => {
    loadSubPayments(subPaymentSearch, providerFilter, planFilter);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Delete this demo payment record?')) return;
    try {
      await api.delete(`/auth/admin/subscription-payments/${paymentId}`);
      toast.success('Payment record deleted');
      loadSubPayments(subPaymentSearch, providerFilter, planFilter);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete payment');
    }
  };

  const handleResetAllPayments = async () => {
    if (
      !window.confirm(
        'Are you sure you want to RESET ALL subscription payments to ₹0 / clean slate?\n\nThis will remove all demo transaction records so you can start fresh with real Razorpay.'
      )
    )
      return;
    try {
      await api.post('/auth/admin/subscription-payments/reset');
      toast.success('All demo payments cleared. Revenue reset to ₹0!');
      loadSubPayments(subPaymentSearch, providerFilter, planFilter);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to reset payments');
    }
  };

  const handleAction = async (userId: string, action: string) => {
    setActionLoading(`${userId}-${action}`);
    setOpenDropdown(null);
    try {
      let payload: any = {};
      switch (action) {
        case 'activate-starter':
          payload = { subscription_status: 'active', plan_tier: 'starter' };
          break;
        case 'activate-pro':
          payload = { subscription_status: 'active', plan_tier: 'pro' };
          break;
        case 'expire':
          payload = { subscription_status: 'expired', plan_tier: 'free_trial' };
          break;
        case 'extend-3':
          payload = { subscription_status: 'trialing', plan_tier: 'free_trial', extend_trial_days: 3 };
          break;
        case 'extend-7':
          payload = { subscription_status: 'trialing', plan_tier: 'free_trial', extend_trial_days: 7 };
          break;
        case 'cancel':
          payload = { subscription_status: 'canceled', plan_tier: 'free_trial' };
          break;
      }
      await api.patch(`/auth/admin/users/${userId}/subscription`, payload);
      toast.success('User updated successfully');
      loadData(searchQuery);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Trialing</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Expired</Badge>;
      case 'canceled':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20">Canceled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (tier: string) => {
    switch (tier) {
      case 'pro':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">Pro</Badge>;
      case 'starter':
        return <Badge className="bg-[#4a6cf7]/10 text-[#4a6cf7] border-[#4a6cf7]/20">Starter</Badge>;
      case 'free_trial':
        return <Badge variant="outline" className="text-muted-foreground">Free Trial</Badge>;
      default:
        return <Badge variant="outline">{tier}</Badge>;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTrialStatus = (user: AdminUser) => {
    if (user.subscription_status === 'active') return '—';
    if (!user.trial_ends_at) return '—';
    const end = new Date(user.trial_ends_at);
    const now = new Date();
    if (end < now) return 'Expired';
    const days = Math.ceil((end.getTime() - now.getTime()) / 86400000);
    return `${days}d left`;
  };

  if (!currentUser?.is_super_user) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="text-muted-foreground mt-1">This page is only available to administrators.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#4a6cf7]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-[#852533]" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Manage users, subscriptions, and platform access.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
              <Users className="w-4 h-4 text-[#4a6cf7]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active (Paid)</CardTitle>
              <Check className="w-4 h-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">On Trial</CardTitle>
              <Clock className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.trialing}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subscription Revenue & Gateway Analytics */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-500" />
              Subscription Revenue & Gateway Analytics
            </h2>
            <p className="text-xs text-muted-foreground">
              Track money collected from Starter and Pro plan upgrades across Razorpay and Stripe.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {subPayments.length > 0 && (
              <Button
                onClick={handleResetAllPayments}
                variant="outline"
                size="sm"
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset Demo Payments
              </Button>
            )}
            <Button
              onClick={() => loadSubPayments(subPaymentSearch, providerFilter, planFilter)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Revenue
            </Button>
          </div>
        </div>

        {subPaymentStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-emerald-500/20 bg-emerald-500/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 flex items-baseline gap-1">
                  {subPaymentStats.total_revenue_inr && subPaymentStats.total_revenue_inr > 0 ? (
                    <span>₹{subPaymentStats.total_revenue_inr.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  ) : (
                    <span>${subPaymentStats.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  )}
                  {subPaymentStats.total_revenue_usd && subPaymentStats.total_revenue_usd > 0 && subPaymentStats.total_revenue_inr && subPaymentStats.total_revenue_inr > 0 ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      + ${subPaymentStats.total_revenue_usd.toFixed(2)}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {subPaymentStats.total_payments} total {subPaymentStats.total_payments === 1 ? 'payment' : 'payments'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-500/20 bg-blue-500/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Stripe Gateway</CardTitle>
                <CreditCard className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ${subPaymentStats.stripe_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {subPaymentStats.stripe_count} {subPaymentStats.stripe_count === 1 ? 'order' : 'orders'} (USD card/global)
                </p>
              </CardContent>
            </Card>

            <Card className="border-amber-500/20 bg-amber-500/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Razorpay Gateway</CardTitle>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  ₹{subPaymentStats.razorpay_revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {subPaymentStats.razorpay_count} {subPaymentStats.razorpay_count === 1 ? 'order' : 'orders'} (INR / UPI / NetBanking)
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-500/20 bg-purple-500/[0.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Plan Distribution</CardTitle>
                <Shield className="w-4 h-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-semibold flex items-center justify-between">
                  <span className="text-blue-500">Starter:</span>
                  <span>
                    {subPaymentStats.starter_count} (
                    {subPaymentStats.starter_revenue_inr && subPaymentStats.starter_revenue_inr > 0
                      ? `₹${subPaymentStats.starter_revenue_inr.toLocaleString()}`
                      : `$${subPaymentStats.starter_revenue}`}
                    )
                  </span>
                </div>
                <div className="text-sm font-semibold flex items-center justify-between mt-1">
                  <span className="text-purple-500">Pro:</span>
                  <span>
                    {subPaymentStats.pro_count} (
                    {subPaymentStats.pro_revenue_inr && subPaymentStats.pro_revenue_inr > 0
                      ? `₹${subPaymentStats.pro_revenue_inr.toLocaleString()}`
                      : `$${subPaymentStats.pro_revenue}`}
                    )
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Subscription Payment Records Table */}
        <Card>
          <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filter payments by user email..."
                  value={subPaymentSearch}
                  onChange={(e) => setSubPaymentSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubPaymentSearch()}
                  className="pl-9"
                />
              </div>

              <select
                value={providerFilter}
                onChange={(e) => {
                  setProviderFilter(e.target.value);
                  loadSubPayments(subPaymentSearch, e.target.value, planFilter);
                }}
                className="h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="">All Gateways</option>
                <option value="stripe">Stripe</option>
                <option value="razorpay">Razorpay</option>
              </select>

              <select
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  loadSubPayments(subPaymentSearch, providerFilter, e.target.value);
                }}
                className="h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="">All Plans</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <Button onClick={handleSubPaymentSearch} variant="outline" size="sm">
              Filter
            </Button>
          </div>

          <div className="overflow-x-auto">
            {subPayments.length > 0 ? (
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium">User / Subscriber</th>
                    <th className="px-4 py-3 font-medium">Plan Tier</th>
                    <th className="px-4 py-3 font-medium">Amount Paid</th>
                    <th className="px-4 py-3 font-medium">Gateway</th>
                    <th className="px-4 py-3 font-medium">Transaction / Session ID</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subPayments.map((pmt) => (
                    <tr key={pmt.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{pmt.user_name || 'Subscriber'}</p>
                        <p className="text-xs text-muted-foreground">{pmt.user_email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {getPlanBadge(pmt.plan_tier)}
                          <span className="text-[10px] text-muted-foreground capitalize">({pmt.billing_cycle})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {pmt.currency === 'INR' ? '₹' : '$'}{pmt.amount.toFixed(2)} {pmt.currency}
                      </td>
                      <td className="px-4 py-3">
                        {pmt.provider === 'stripe' ? (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Stripe</Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Razorpay</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground max-w-[200px] truncate block" title={pmt.provider_txn_id || pmt.provider_order_id || '—'}>
                          {pmt.provider_txn_id || pmt.provider_order_id || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          {pmt.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(pmt.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeletePayment(pmt.id)}
                          title="Delete demo payment"
                          className="text-muted-foreground hover:text-red-500 transition-colors p-1.5 rounded hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-medium text-sm">No subscription payments recorded yet.</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  When users purchase Starter or Pro plans after their trial, their transaction records and amounts will show up here.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* User Management */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-[#852533]" />
            User Management & Access Controls
          </h2>
          <p className="text-xs text-muted-foreground">
            Search users, manage subscription tiers, and extend trials.
          </p>
        </div>
      </div>

      {/* Search + Table */}
      <Card>
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} variant="outline" size="sm">
              Search
            </Button>
          </div>
          <Button onClick={() => loadData(searchQuery)} variant="outline" size="sm" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          {users.length > 0 ? (
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Trial</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{user.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                        {user.is_super_user && (
                          <Badge className="mt-1 bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                            ADMIN
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(user.subscription_status)}
                        {!user.email_verified && (
                          <span className="text-[10px] text-amber-500">Email not verified</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getPlanBadge(user.plan_tier)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{getTrialStatus(user)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3">
                      {!user.is_super_user && (
                        <div className="relative">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs flex items-center gap-1"
                            onClick={() => setOpenDropdown(openDropdown === user.id ? null : user.id)}
                          >
                            Actions
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                          {openDropdown === user.id && (
                            <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-border bg-card shadow-lg py-1">
                              <button
                                onClick={() => handleAction(user.id, 'activate-starter')}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                              >
                                <Check className="h-3 w-3 text-emerald-500" /> Activate (Starter)
                              </button>
                              <button
                                onClick={() => handleAction(user.id, 'activate-pro')}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                              >
                                <Check className="h-3 w-3 text-purple-500" /> Activate (Pro)
                              </button>
                              <button
                                onClick={() => handleAction(user.id, 'extend-3')}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                              >
                                <Clock className="h-3 w-3 text-blue-500" /> Extend Trial +3 Days
                              </button>
                              <button
                                onClick={() => handleAction(user.id, 'extend-7')}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2"
                              >
                                <Clock className="h-3 w-3 text-blue-500" /> Extend Trial +7 Days
                              </button>
                              <div className="border-t border-border my-1" />
                              <button
                                onClick={() => handleAction(user.id, 'expire')}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-red-500"
                              >
                                <AlertTriangle className="h-3 w-3" /> Force Expire
                              </button>
                              <button
                                onClick={() => handleAction(user.id, 'cancel')}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-muted flex items-center gap-2 text-red-500"
                              >
                                <X className="h-3 w-3" /> Cancel Subscription
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Users className="w-10 h-10 text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium">No users found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? 'No users match your search.' : 'No users have registered yet.'}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

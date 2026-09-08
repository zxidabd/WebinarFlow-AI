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

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
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

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = () => {
    loadData(searchQuery);
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

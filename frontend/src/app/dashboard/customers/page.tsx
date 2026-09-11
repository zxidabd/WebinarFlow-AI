'use client';

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  Download,
  Mail,
  Eye,
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  ShoppingBag,
  Loader2,
  Inbox,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listRegistrations, deleteRegistrant } from '@/lib/webinar-api';

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const qc = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRegistrant(id),
    onSuccess: () => {
      toast.success('Registration deleted');
      qc.invalidateQueries({ queryKey: ['dashboard-customers'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to delete registration'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-customers', searchQuery, statusFilter],
    queryFn: () => listRegistrations({
      search: searchQuery || undefined,
      status: statusFilter !== 'All' ? statusFilter : undefined,
    }),
    placeholderData: (previousData) => previousData,
    refetchInterval: 8000,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  const customers = data?.items || [];
  const totalLeads = data?.totalLeads ?? 0;
  const activeBuyers = data?.activeBuyers ?? 0;
  const avgLtv = data?.avgLtv ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Customers & Registrants</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage leads, attendees, and active buyers across all your automated webinar funnels in real-time.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!customers.length) return alert('No contacts to export yet.');
            const csv = 'Name,Email,Webinar,Status,Total Spent,Date Joined\n' +
              customers.map(c => `"${c.name}","${c.email}","${c.webinarTitle}","${c.status}","${c.totalSpent}","${c.dateJoined}"`).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `webinarflow-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Download className="h-4 w-4" />
          Export Contacts
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4a6cf7]/10 text-[#4a6cf7]">
                <Users className="h-4 w-4" />
              </span>
              Total Leads & Contacts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && !data ? (
              <div className="h-8 w-16 bg-muted/60 animate-pulse rounded my-0.5" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <ShoppingBag className="h-4 w-4" />
              </span>
              Active Buyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && !data ? (
              <div className="h-8 w-16 bg-muted/60 animate-pulse rounded my-0.5" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{activeBuyers}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
                <DollarSign className="h-4 w-4" />
              </span>
              Average LTV
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && !data ? (
              <div className="h-8 w-20 bg-muted/60 animate-pulse rounded my-0.5" />
            ) : (
              <p className="text-2xl font-bold text-foreground">
                ${avgLtv.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contacts Table Card */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-card/40 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, or webinar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-input rounded-lg text-sm bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[#4a6cf7]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-3 border border-input rounded-lg text-sm bg-background text-foreground focus:outline-none focus:border-[#4a6cf7]"
              >
                <option value="All">All Contacts</option>
                <option value="Registered">Registered</option>
                <option value="Attended">Attended</option>
                <option value="Purchased">Purchased</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && !data ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted/60 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-32 bg-muted/60 animate-pulse rounded" />
                      <div className="h-2.5 w-48 bg-muted/40 animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-28 bg-muted/40 animate-pulse rounded hidden sm:block" />
                  <div className="h-6 w-20 bg-muted/60 animate-pulse rounded-full" />
                </div>
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Inbox className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No contacts yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                As visitors register on your webinar landing pages, they will appear here live in real-time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-3 font-medium">Customer Name</th>
                    <th className="px-6 py-3 font-medium">Webinar Funnel</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Total Spent</th>
                    <th className="px-6 py-3 font-medium">Date Joined</th>
                    <th className="px-6 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#4a6cf7]/10 text-[#4a6cf7] font-semibold text-xs">
                            {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-foreground/90 font-medium">{c.webinarTitle}</td>
                      <td className="px-6 py-4">
                        {c.status === 'Purchased' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Purchased
                          </span>
                        )}
                        {c.status === 'Attended' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                            <Eye className="h-3.5 w-3.5" /> Attended
                          </span>
                        )}
                        {c.status === 'Registered' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" /> Registered
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-foreground">${c.totalSpent.toFixed(2)}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{c.dateJoined}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`mailto:${c.email}`}
                            className="p-1.5 inline-block rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title={`Email ${c.email}`}
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete registration for ${c.name || c.email}?`)) {
                                deleteMut.mutate(c.id);
                              }
                            }}
                            className="p-1.5 inline-block rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title={`Delete ${c.name || c.email}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

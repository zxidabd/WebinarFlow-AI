'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Download, Eye, Loader2, Search, Trash2, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import * as api from '@/lib/webinar-api';
import type { RegistrantItem } from '@/lib/webinar-api';

const STATUS_COLORS: Record<string, string> = {
  registered: 'bg-blue-100 text-blue-800 border-blue-200',
  attended: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
  noshow: 'bg-gray-100 text-gray-800 border-gray-200',
  visited: 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function RegistrationsPage() {
  const router = useRouter();
  const params = useParams<{ id: string; lpId: string }>();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<RegistrantItem | null>(null);
  const [exporting, setExporting] = useState(false);

  // Auto-refresh every 5 seconds so new registrations appear immediately
  const { data, isLoading, isError } = useQuery({
    queryKey: ['registrations', params.lpId, search, sortOrder],
    queryFn: () => api.listRegistrations(params.lpId, {
      search: search || undefined,
      order: sortOrder,
      limit: 200,
    }),
    refetchInterval: 5000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteRegistrant(id),
    onSuccess: () => {
      toast.success('Registration deleted');
      qc.invalidateQueries({ queryKey: ['registrations', params.lpId] });
      setSelected(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to delete'),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const exportCSV = async () => {
    setExporting(true);
    try {
      const rows = [
        ['Full Name', 'Email', 'Registration Date & Time', 'Status', 'Landing Page'],
        ...items.map(r => [
          `"${(r.full_name || '').replace(/"/g, '""')}"`,
          `"${r.email.replace(/"/g, '""')}"`,
          `"${new Date(r.registered_at).toLocaleString()}"`,
          r.status,
          r.landing_page_id ? 'Landing Page' : 'Direct',
        ]),
      ].map(row => row.join(',')).join('\r\n');

      const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registrations-${params.lpId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-semibold">Registrations</h1>
            <p className="text-sm text-muted-foreground">{total} registration{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!items.length || exporting}>
            <Download className="mr-1 h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Search + sort */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground" value={sortOrder} onChange={e => setSortOrder(e.target.value as 'asc' | 'desc')}>
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading registrations…
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Failed to load registrations. Please try again.
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && items.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <Users className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">No registrations yet</p>
            <p className="text-xs text-muted-foreground">When someone registers via the landing page, they appear here in real time.</p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!isLoading && !isError && items.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Full Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date & Time</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{r.full_name || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(r.registered_at).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={STATUS_COLORS[r.status] || ''}>{r.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(r)} title="View details"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => { if (confirm('Delete this registration?')) deleteMut.mutate(r.id); }} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-lg mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Registration Details</CardTitle>
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetailRow label="Full Name" value={selected.full_name} />
              <DetailRow label="Email" value={selected.email} />
              <DetailRow label="Registered At" value={new Date(selected.registered_at).toLocaleString()} />
              <DetailRow label="Status" value={selected.status} />
              <DetailRow label="Landing Page" value={selected.landing_page_id ? 'Linked to landing page' : 'Direct registration'} />
              <DetailRow label="UTM Source" value={selected.utm_source} />
              <DetailRow label="UTM Medium" value={selected.utm_medium} />
              <DetailRow label="UTM Campaign" value={selected.utm_campaign} />
              <DetailRow label="UTM Content" value={selected.utm_content} />
              <DetailRow label="UTM Term" value={selected.utm_term} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  );
}

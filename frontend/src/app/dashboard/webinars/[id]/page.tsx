'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Pencil, Copy, Trash2, ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WebinarStatus } from '@/types/webinar';
import * as api from '@/lib/webinar-api';

const STATUS_STYLES: Record<WebinarStatus, string> = {
  draft: 'bg-amber-100 text-amber-800 border-amber-200',
  scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
  live: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completed: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
};

const fmt = (s: string | null) => (s ? new Date(s).toLocaleString() : '—');

export default function WebinarDetailPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();

  const { data: webinar, isLoading, isError } = useQuery({
    queryKey: ['webinar', params.id],
    queryFn: () => api.getWebinar(params.id),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.deleteWebinar(params.id),
    onSuccess: () => { toast.success('Webinar deleted'); router.push('/dashboard/webinars'); },
  });
  const duplicateMut = useMutation({
    mutationFn: () => api.duplicateWebinar(params.id),
    onSuccess: (r) => { toast.success('Duplicate created'); router.push(`/dashboard/webinars/${r.duplicate_id}`); },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20 text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
    </div>
  );

  if (isError || !webinar) return (
    <div className="flex items-start gap-3 rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>Webinar not found.</p>
    </div>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" onClick={() => router.push('/dashboard/webinars')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Webinars
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/webinars/${webinar.id}/landing-pages`)}>
            <ExternalLink className="mr-1 h-4 w-4" /> Landing Pages
          </Button>
          <Button variant="outline" size="sm" onClick={() => duplicateMut.mutate()}>
            <Copy className="mr-1 h-4 w-4" /> Duplicate
          </Button>
          <Button variant="destructive" size="sm" onClick={() => { if (confirm('Delete this webinar?')) deleteMut.mutate(); }}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">{webinar.title}</h1>
          <div className="mt-2 flex gap-3 items-center flex-wrap">
            <Badge variant="outline" className={STATUS_STYLES[webinar.status]}>{webinar.status}</Badge>
            {webinar.is_published && <Badge className="bg-green-600">Published</Badge>}
            <span className="text-sm text-muted-foreground">Slug: /{webinar.slug}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Description:</span><p className="mt-1 whitespace-pre-wrap">{webinar.description || 'No description'}</p></div>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">Starts</span><p className="font-medium">{fmt(webinar.starts_at)}</p></div>
              <div><span className="text-muted-foreground">Ends</span><p className="font-medium">{fmt(webinar.ends_at)}</p></div>
              <div><span className="text-muted-foreground">Timezone</span><p className="font-medium">{webinar.timezone}</p></div>
              <div><span className="text-muted-foreground">Provider</span><p className="font-medium capitalize">{webinar.provider}</p></div>
              <div><span className="text-muted-foreground">Capacity</span><p className="font-medium">{webinar.capacity || 'Unlimited'}</p></div>
              <div><span className="text-muted-foreground">Location</span><p className="font-medium capitalize">{webinar.location_type}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Registrations</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Registered', count: webinar.registration_count, color: 'text-blue-600' },
                { label: 'Attended', count: webinar.attendance_count, color: 'text-emerald-600' },
                { label: 'Visitors', count: webinar.visitor_count, color: 'text-gray-600' },
              ].map(m => (
                <div key={m.label} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                  <span className="text-sm text-muted-foreground">{m.label}</span>
                  <span className={`text-2xl font-bold ${m.color}`}>{m.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
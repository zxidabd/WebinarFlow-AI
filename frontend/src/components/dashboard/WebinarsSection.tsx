'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { CalendarClock, Video, Users, BarChart3, Sparkles, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listWebinars } from '@/lib/webinar-api';
import type { WebinarStatus } from '@/types/webinar';

const STATUS_STYLES: Record<WebinarStatus, string> = {
  draft: 'bg-neutral-800/90 text-amber-300 border-amber-600/40',
  scheduled: 'bg-neutral-800/90 text-blue-300 border-blue-600/40',
  live: 'bg-emerald-950 text-emerald-300 border-emerald-600/40',
  completed: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  cancelled: 'bg-rose-950 text-rose-300 border-rose-600/40',
};

export function WebinarsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ['webinars-overview'],
    queryFn: () => listWebinars({ limit: 4, sort: 'created_at', order: 'desc' }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <section aria-label="Webinars">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-foreground">Webinars</h2>
        <Link href="/dashboard/webinars" className="text-xs font-medium text-[#7a222e] hover:text-[#45141B] flex items-center gap-1 transition-colors">
          View all {total > 0 ? `(${total})` : ''} →
        </Link>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-neutral-900 border-neutral-800 shadow-sm animate-pulse">
              <CardHeader className="pb-3"><div className="h-4 w-24 rounded bg-neutral-800" /></CardHeader>
              <CardContent><div className="h-8 w-16 rounded bg-neutral-800" /></CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <Card className="bg-neutral-900 border-neutral-800 text-white">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#45141B]/20 text-[#f8a5b2] border border-[#6b202c] mb-3">
              <Video className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-white mb-1">No webinars created yet</p>
            <p className="text-xs text-neutral-400 mb-4">Start by creating your first AI-assisted webinar campaign.</p>
            <Link href="/dashboard/webinars">
              <Button size="sm" className="bg-[#45141B] hover:bg-[#5a1a23] text-white border border-[#6b202c]">
                <Plus className="mr-1.5 h-4 w-4" /> Create Webinar
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(w => (
            <Link key={w.id} href={`/dashboard/webinars/${w.id}`}>
              <Card className="group bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 text-white shadow-md transition-all duration-200 hover:-translate-y-1 hover:border-neutral-700 hover:shadow-xl cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-semibold text-white line-clamp-2">{w.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge variant="outline" className={`${STATUS_STYLES[w.status]} text-xs transition-colors duration-200`}>{w.status}</Badge>
                  <div className="flex items-center gap-3 text-xs text-neutral-400">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{w.registration_count}</span>
                    <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />{w.starts_at ? new Date(w.starts_at).toLocaleDateString() : 'TBD'}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {total > 4 && (
        <div className="mt-3 text-center">
          <Link href="/dashboard/webinars" className="text-xs text-muted-foreground hover:text-primary">
            View all {total} webinars →
          </Link>
        </div>
      )}
    </section>
  );
}

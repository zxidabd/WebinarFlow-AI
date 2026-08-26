'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Pencil, Copy, Trash2, Eye, Loader2, AlertCircle, X, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { LandingPage, LandingPageItem } from '@/types/webinar';
import * as api from '@/lib/webinar-api';
import { apiErrorMessage } from '@/lib/auth-api';

const formSchema = z.object({
  title: z.string().min(2, 'Required').max(255),
  slug: z.string().optional(),
  page_type: z.enum(['opt_in', 'thank_you', 'sales', 'replay', 'custom']).default('opt_in'),
  template_id: z.string().optional().nullable(),
  meta_title: z.string().max(255).optional().nullable(),
  meta_description: z.string().max(512).optional().nullable(),
  is_published: z.boolean().default(false),
});

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800 border-amber-200',
  published: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  archived: 'bg-gray-100 text-gray-800 border-gray-200',
};
const PAGE_TYPE_LABELS: Record<string, string> = {
  opt_in: 'Opt-in',
  thank_you: 'Thank You',
  sales: 'Sales',
  replay: 'Replay',
  custom: 'Custom',
};

export default function LandingPagesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LandingPage | LandingPageItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['landing-pages', params.id],
    queryFn: () => api.listLandingPages({ webinar_id: params.id }),
  });

  const deleteMut = useMutation({
    mutationFn: api.deleteLandingPage,
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['landing-pages'] }); },
  });
  const duplicateMut = useMutation({
    mutationFn: api.duplicateLandingPage,
    onSuccess: () => { toast.success('Duplicated'); qc.invalidateQueries({ queryKey: ['landing-pages'] }); },
  });
  const publishMut = useMutation({
    mutationFn: (id: string) => api.updateLandingPage(id, { is_published: true }),
    onSuccess: () => { toast.success('Published!'); qc.invalidateQueries({ queryKey: ['landing-pages'] }); },
  });

  const form = useForm<any>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: { title: '', slug: '', page_type: 'opt_in', meta_title: null, meta_description: null, is_published: false },
  });

  const saveMut = useMutation({
    mutationFn: async (vals: z.infer<typeof formSchema>) => {
      const { template_id, ...rest } = vals;
      const contentPayload: any = { ...rest, webinar_id: params.id };

      // Strip empty slug string so backend auto-generates slug
      if (typeof contentPayload.slug === 'string' && !contentPayload.slug.trim()) {
        delete contentPayload.slug;
      }

      const selectedTemplateId = template_id || 'modern-saas';
      contentPayload.template_id = selectedTemplateId;
      try {
        const { getTemplate } = await import('@/components/landing-page/templates/registry');
        const tpl = getTemplate(selectedTemplateId);
        if (tpl) {
          contentPayload.content = { template: selectedTemplateId, sections: tpl.defaults };
        }
      } catch {}
      if (editing) {
        return api.updateLandingPage(editing.id, contentPayload);
      } else {
        return api.createLandingPage(contentPayload);
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Updated' : 'Created');
      qc.invalidateQueries({ queryKey: ['landing-pages'] });
      setShowForm(false);
    },
    onError: (e: any) => toast.error(apiErrorMessage(e, 'Failed to save landing page')),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-semibold">Landing Pages</h1>
            <p className="text-sm text-muted-foreground">Manage opt-in pages, thank-you pages, and funnels</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); form.reset(); setShowForm(true); }}>
          <Plus className="mr-1 h-4 w-4" /> New Landing Page
        </Button>
      </div>

      {showForm && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editing ? 'Edit Landing Page' : 'Create Landing Page'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((v: any) => saveMut.mutate(v))} className="space-y-4 max-w-xl">
              <div>
                <Label htmlFor="title">Page Title *</Label>
                <Input id="title" placeholder="e.g. Masterclass Opt-In Page" {...form.register('title')} />
                {form.formState.errors.title && <p className="text-xs text-rose-500 mt-1">{form.formState.errors.title.message as string}</p>}
              </div>

              <div>
                <Label htmlFor="page_type">Page Type</Label>
                <select id="page_type" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" {...form.register('page_type')}>
                  <option value="opt_in">Opt-in Page</option>
                  <option value="thank_you">Thank You Page</option>
                  <option value="sales">Sales Page</option>
                  <option value="replay">Replay Page</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <Label htmlFor="template_id">Choose Design Template</Label>
                <select id="template_id" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" {...form.register('template_id')}>
                  <option value="">Blank / Custom</option>
                  <option value="modern-saas">Modern SaaS (Stripe/Linear style)</option>
                  <option value="corporate">Corporate & Enterprise (Executive style)</option>
                  <option value="education">Education & Course (Academy style)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="slug">Custom URL Slug (optional)</Label>
                <Input id="slug" placeholder="e.g. masterclass-optin (leave empty for auto-generated slug)" {...form.register('slug')} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={saveMut.isPending}>
                  {saveMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  {editing ? 'Save Changes' : 'Create Page'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading landing pages…
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <p className="text-sm font-medium mb-1">No landing pages created yet</p>
            <p className="text-xs text-muted-foreground mb-4">Create your first opt-in page to start collecting webinar registrants.</p>
            <Button onClick={() => { setEditing(null); form.reset(); setShowForm(true); }}>
              <Plus className="mr-1 h-4 w-4" /> Create Landing Page
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((lp) => (
            <Card key={lp.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">{lp.title}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">/r/{lp.slug}</p>
                  </div>
                  <Badge variant="outline" className={STATUS_STYLES[lp.status] || ''}>{lp.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>Type: {PAGE_TYPE_LABELS[lp.page_type] || lp.page_type}</span>
                  <span>{lp.is_published ? 'Published' : 'Draft'}</span>
                </div>
                <div className="flex items-center justify-end gap-1 pt-2">
                  <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/webinars/${params.id}/landing-pages/${lp.id}`)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/dashboard/webinars/${params.id}/landing-pages/registrations/${lp.id}`)} title="View registrants">
                    <Users className="h-4 w-4" />
                  </Button>
                  {lp.is_published ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`/r/${lp.slug}`, '_blank')} title="View live page">
                      <Eye className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => publishMut.mutate(lp.id)}>Publish</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
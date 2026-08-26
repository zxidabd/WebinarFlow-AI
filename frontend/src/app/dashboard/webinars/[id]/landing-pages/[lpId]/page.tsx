'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, ExternalLink, Loader2, Copy, Trash2, Eye, Edit3, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import LandingPageRenderer from '@/components/landing-page/LandingPageRenderer';
import TemplateEditor from '@/components/landing-page/editor/TemplateEditor';
import { getTemplate, getAllTemplates } from '@/components/landing-page/templates/registry';
import * as api from '@/lib/webinar-api';

export default function LandingPageDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string; lpId: string }>();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: lp, isLoading } = useQuery({
    queryKey: ['landing-page', params.lpId],
    queryFn: () => api.getLandingPage(params.lpId),
  });

  // Fetch parent webinar to get pricing info (is_paid, price_cents, currency, payment_gateway)
  const { data: webinar } = useQuery({
    queryKey: ['webinar', params.id],
    queryFn: () => api.getWebinar(params.id),
    enabled: !!params.id,
  });

  const updateMut = useMutation({
    mutationFn: (payload: any) => api.updateLandingPage(params.lpId, payload),
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['landing-page'] });
      setEditing(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Error saving'),
  });

  const togglePublish = useMutation({
    mutationFn: (publish: boolean) => api.updateLandingPage(params.lpId, { is_published: publish }),
    onSuccess: (_, publish) => {
      toast.success(publish ? 'Published!' : 'Unpublished');
      qc.invalidateQueries({ queryKey: ['landing-page'] });
    },
  });

  const duplicateMut = useMutation({
    mutationFn: () => api.duplicateLandingPage(params.lpId),
    onSuccess: (r) => {
      toast.success('Duplicated');
      router.push(`/dashboard/webinars/${params.id}/landing-pages/${r.duplicate_id}`);
    },
  });

  if (isLoading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…</div>;

  if (!lp) return <div className="p-6 text-muted-foreground">Landing page not found.</div>;

  // Determine the current content state
  const content = lp.content || {};
  const hasTemplate = !!lp.template_id;
  const templateInfo = lp.template_id ? getTemplate(lp.template_id) : null;

  const handleSaveEditor = (data: { template: string; sections: Record<string, any> }) => {
    updateMut.mutate({
      template_id: data.template,
      content: data,
    });
  };

  // If editing, show the template editor instead of preview
  if (editing) {
    return (
      <div className="h-full">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setEditing(false)}><ArrowLeft className="h-4 w-4" /></Button>
            <h1 className="font-semibold">Editing: {lp.title}</h1>
          </div>
          <div className="flex gap-2 items-center">
            <Badge variant={lp.is_published ? 'default' : 'outline'} className={lp.is_published ? 'bg-green-600' : ''}>
              {lp.is_published ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </div>
        <div className="flex-1 p-6" style={{ height: 'calc(100vh - 120px)' }}>
          <TemplateEditor
            initialState={{
              template: (typeof content?.template === 'string' ? content.template : lp.template_id) || 'modern-saas',
              sections: (content?.sections as Record<string, any>) || (typeof content === 'object' && !content?.template ? content : {}),
            }}
            onSave={handleSaveEditor}
            onCancel={() => setEditing(false)}
            webinarId={params.id}
            isPaid={webinar?.is_paid}
            priceCents={webinar?.price_cents}
            currency={webinar?.currency}
            paymentGateway={webinar?.payment_gateway}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-semibold">{lp.title}</h1>
            <p className="text-sm text-muted-foreground">
              {templateInfo ? templateInfo.name : lp.page_type}
              {' · '}
              /r/{lp.slug}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {lp.is_published && (
            <Button variant="outline" size="sm" onClick={() => window.open(`/r/${lp.slug}`, '_blank')}>
              <Eye className="mr-1 h-4 w-4" /> View Live
            </Button>
          )}
          {lp.is_published ? (
            <Button variant="outline" size="sm" onClick={() => togglePublish.mutate(false)}>
              Unpublish
            </Button>
          ) : (
            <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => togglePublish.mutate(true)}>
              Publish
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/webinars/${params.id}/landing-pages/registrations/${params.lpId}`)}>
            <Users className="mr-1 h-4 w-4" /> Registrations
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit3 className="mr-1 h-4 w-4" /> Edit Content
          </Button>
          <Button variant="outline" size="sm" onClick={() => duplicateMut.mutate()}>
            <Copy className="mr-1 h-4 w-4" /> Duplicate
          </Button>
          <Button variant="destructive" size="sm" onClick={() => {
            if (confirm('Delete this landing page?')) {
              api.deleteLandingPage(params.lpId).then(() => {
                toast.success('Deleted');
                router.push(`/dashboard/webinars/${params.id}/landing-pages`);
              });
            }
          }}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Template selector or prompt */}
      {!hasTemplate && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Choose a Template</h3>
          <p className="text-sm text-gray-400 mb-6">Select a template to start building your landing page.</p>
          <div className="flex flex-wrap justify-center gap-4">
            {getAllTemplates().map(t => (
              <button
                key={t.id}
                onClick={() => {
                  updateMut.mutate({
                    template_id: t.id,
                    content: { template: t.id, sections: t.defaults },
                  });
                }}
                className="group relative rounded-xl border-2 border-gray-100 bg-white p-6 text-left shadow-sm hover:shadow-md hover:border-indigo-200 transition-all w-56"
              >
                <div className="h-24 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 mb-3 flex items-center justify-center text-indigo-400 text-sm">{t.name.charAt(0)}</div>
                <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600">{t.name}</h4>
                <p className="text-xs text-gray-400 mt-1">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {hasTemplate && content?.template && (
        <>
          <div className="rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
            <div className="bg-white px-4 py-2 text-xs text-gray-400 border-b border-gray-100 flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
              Preview
            </div>
            <LandingPageRenderer
              content={content}
              webinarId={params.id}
              preview
              isPaid={webinar?.is_paid}
              priceCents={webinar?.price_cents}
              currency={webinar?.currency}
              paymentGateway={webinar?.payment_gateway}
            />
          </div>
        </>
      )}
    </div>
  );
}

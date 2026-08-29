'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Copy,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  X,
  Users,
  Layers,
  Building2,
  GraduationCap,
  Sparkles,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LandingPage, LandingPageItem } from '@/types/webinar';
import * as api from '@/lib/webinar-api';
import { apiErrorMessage } from '@/lib/auth-api';
import { TEMPLATES } from '@/components/landing-page/templates/registry';

const formSchema = z.object({
  title: z.string().min(2, 'Title is required (min 2 chars)').max(255),
  slug: z.string().optional(),
  page_type: z.enum(['opt_in', 'thank_you', 'sales', 'replay', 'custom']).default('opt_in'),
  template_id: z.enum(['modern-saas', 'corporate', 'education']).default('modern-saas'),
  is_paid: z.boolean().default(false),
  price_amount: z.coerce.number().min(0).default(0),
  currency: z.string().default('usd'),
  payment_gateway: z.string().default('stripe'),
  meta_title: z.string().max(255).optional().nullable(),
  meta_description: z.string().max(512).optional().nullable(),
  is_published: z.boolean().default(false),
}).refine((data) => {
  if (data.is_paid && (!data.price_amount || data.price_amount <= 0)) {
    return false;
  }
  return true;
}, { message: 'Ticket price must be greater than 0 for paid landing pages', path: ['price_amount'] });

type FormValues = z.infer<typeof formSchema>;

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  published: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  archived: 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-neutral-300 border-gray-200 dark:border-neutral-700',
};

const TEMPLATE_OPTIONS = [
  {
    id: 'modern-saas',
    name: 'Modern SaaS',
    subtitle: 'Sleek tech, product launch & interactive style',
    icon: Sparkles,
    badge: 'Popular',
    accent: 'from-indigo-500 to-purple-600',
  },
  {
    id: 'corporate',
    name: 'Corporate & Enterprise',
    subtitle: 'Executive briefing, trust, and business consulting style',
    icon: Building2,
    badge: 'Executive',
    accent: 'from-blue-600 to-cyan-700',
  },
  {
    id: 'education',
    name: 'Education / Course',
    subtitle: 'Academy masterclass, syllabus & student enrollment style',
    icon: GraduationCap,
    badge: 'Academy',
    accent: 'from-emerald-600 to-teal-700',
  },
];

export default function LandingPagesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LandingPage | LandingPageItem | null>(null);

  const { data: webinar } = useQuery({
    queryKey: ['webinar', params.id],
    queryFn: () => api.getWebinar(params.id),
    enabled: !!params.id,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['landing-pages', params.id],
    queryFn: () => api.listLandingPages({ webinar_id: params.id }),
  });

  const deleteMut = useMutation({
    mutationFn: api.deleteLandingPage,
    onSuccess: () => {
      toast.success('Landing page deleted');
      qc.invalidateQueries({ queryKey: ['landing-pages'] });
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });

  const duplicateMut = useMutation({
    mutationFn: api.duplicateLandingPage,
    onSuccess: () => {
      toast.success('Landing page duplicated');
      qc.invalidateQueries({ queryKey: ['landing-pages'] });
    },
    onError: (e: any) => toast.error(apiErrorMessage(e)),
  });

  const publishMut = useMutation({
    mutationFn: (id: string) => api.updateLandingPage(id, { is_published: true }),
    onSuccess: () => {
      toast.success('Published live!');
      qc.invalidateQueries({ queryKey: ['landing-pages'] });
      qc.invalidateQueries({ queryKey: ['webinar', params.id] });
      qc.invalidateQueries({ queryKey: ['webinars'] });
    },
    onError: (e: any) => toast.error(apiErrorMessage(e, 'Failed to publish landing page')),
  });

  const unpublishMut = useMutation({
    mutationFn: (id: string) => api.updateLandingPage(id, { is_published: false }),
    onSuccess: () => {
      toast.success('Unpublished');
      qc.invalidateQueries({ queryKey: ['landing-pages'] });
      qc.invalidateQueries({ queryKey: ['webinar', params.id] });
      qc.invalidateQueries({ queryKey: ['webinars'] });
    },
    onError: (e: any) => toast.error(apiErrorMessage(e, 'Failed to unpublish landing page')),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: '',
      slug: '',
      page_type: 'opt_in',
      template_id: 'modern-saas',
      is_paid: false,
      price_amount: 0,
      currency: 'usd',
      payment_gateway: 'stripe',
      meta_title: null,
      meta_description: null,
      is_published: false,
    },
  });

  const openCreateModal = () => {
    setEditing(null);
    form.reset({
      title: webinar ? `${webinar.title} — Registration` : '',
      slug: '',
      page_type: 'opt_in',
      template_id: 'modern-saas',
      is_paid: false,
      price_amount: 0,
      currency: 'usd',
      payment_gateway: 'stripe',
      meta_title: null,
      meta_description: webinar?.description || null,
      is_published: false,
    });
    setShowModal(true);
  };

  const saveMut = useMutation({
    mutationFn: async (vals: FormValues) => {
      const priceCents = vals.is_paid && vals.price_amount ? Math.round(Number(vals.price_amount) * 100) : 0;
      const selectedTemplateId = vals.template_id || 'modern-saas';

      const payload: any = {
        webinar_id: params.id,
        title: vals.title,
        page_type: vals.page_type,
        template_id: selectedTemplateId,
        is_paid: vals.is_paid,
        price_cents: priceCents,
        currency: vals.currency || 'usd',
        payment_gateway: vals.payment_gateway || 'stripe',
        is_published: false,
        status: 'draft',
      };

      if (vals.slug && vals.slug.trim()) {
        payload.slug = vals.slug.trim();
      }

      // Populate default structured content from template definition
      try {
        const tpl = TEMPLATES[selectedTemplateId];
        if (tpl) {
          payload.content = {
            template: selectedTemplateId,
            sections: tpl.defaults,
          };
        }
      } catch (err) {
        console.error('Error attaching template defaults', err);
      }

      if (editing) {
        return api.updateLandingPage(editing.id, payload);
      } else {
        return api.createLandingPage(payload);
      }
    },
    onSuccess: (res: any) => {
      toast.success(editing ? 'Landing page updated' : 'Landing page created (Draft)');
      qc.invalidateQueries({ queryKey: ['landing-pages'] });
      setShowModal(false);
      if (res?.id && !editing) {
        router.push(`/dashboard/webinars/${params.id}/landing-pages/${res.id}`);
      }
    },
    onError: (e: any) => toast.error(apiErrorMessage(e, 'Failed to save landing page')),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/webinars')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Landing Pages</h1>
              {webinar && (
                <Badge variant="outline" className="text-xs font-normal">
                  {webinar.title}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Manage templates, pricing offers, and registration funnels</p>
          </div>
        </div>
        <Button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
          <Plus className="mr-1.5 h-4 w-4" /> Create New Landing Page
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading landing pages…
        </div>
      )}

      {/* Empty State: Explicitly asks to Create New Landing Page */}
      {!isLoading && items.length === 0 && (
        <Card className="border-2 border-dashed border-gray-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-900/50">
          <CardContent className="flex flex-col items-center py-20 text-center max-w-md mx-auto">
            <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm">
              <Layers className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">No landing page created yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create a custom landing page for this webinar. Choose from Modern SaaS, Corporate, or Education templates with Free or Paid ticket pricing.
            </p>
            <Button onClick={openCreateModal} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 shadow-sm">
              <Plus className="mr-1.5 h-4 w-4" /> Create New Landing Page
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Landing Pages List */}
      {!isLoading && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((lp) => (
            <Card key={lp.id} className="group hover:shadow-md transition-all border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base font-semibold truncate text-gray-900 dark:text-white">{lp.title}</CardTitle>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">/r/{lp.slug}</p>
                  </div>
                  <Badge variant="outline" className={STATUS_STYLES[lp.status] || ''}>{lp.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-gray-100 dark:border-neutral-800">
                  <span className="capitalize font-medium text-indigo-600 dark:text-indigo-400">
                    {lp.template_id ? lp.template_id.replace('-', ' ') : 'Modern SaaS'}
                  </span>
                  <span>{lp.is_published ? 'Live Online' : 'Draft'}</span>
                </div>
                <div className="flex items-center justify-end gap-1 pt-2">
                  <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/webinars/${params.id}/landing-pages/${lp.id}`)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => router.push(`/dashboard/webinars/${params.id}/landing-pages/registrations/${lp.id}`)}
                    title="View registrants"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => duplicateMut.mutate(lp.id)}
                    title="Duplicate page"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm('Delete this landing page?')) deleteMut.mutate(lp.id);
                    }}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {lp.is_published ? (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 dark:text-emerald-400" onClick={() => window.open(`/r/${lp.slug}`, '_blank')} title="View live page">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-50 h-7 px-2 font-medium"
                        disabled={unpublishMut.isPending}
                        onClick={() => unpublishMut.mutate(lp.id)}
                      >
                        {unpublishMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Unpublish'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-7 px-2.5 shadow-sm"
                      disabled={publishMut.isPending}
                      onClick={() => publishMut.mutate(lp.id)}
                    >
                      {publishMut.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                      Publish
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── CREATE / EDIT LANDING PAGE MODAL ─────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white shadow-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-neutral-800">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editing ? 'Edit Landing Page' : 'Create New Landing Page'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select your template style, pricing configuration, and URL slug
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={form.handleSubmit((v) => saveMut.mutate(v))} className="space-y-5">
              {/* STEP 1: Template Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  Step 1: Choose Template Style *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {TEMPLATE_OPTIONS.map((tpl) => {
                    const isSelected = form.watch('template_id') === tpl.id;
                    const Icon = tpl.icon;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => form.setValue('template_id', tpl.id as any)}
                        className={`relative text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-600/30'
                            : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-gray-300 dark:hover:border-neutral-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${tpl.accent} text-white shadow-sm`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white leading-snug">{tpl.name}</p>
                          <p className="text-[11px] text-gray-500 dark:text-neutral-400 mt-1 leading-tight">{tpl.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: Page Title & Custom URL Slug */}
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  Step 2: Page Details
                </label>
                <div>
                  <label htmlFor="title" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Page Title *
                  </label>
                  <input
                    id="title"
                    placeholder="e.g. Masterclass Registration Page"
                    className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all"
                    {...form.register('title')}
                  />
                  {form.formState.errors.title && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{form.formState.errors.title.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="slug" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Custom URL Slug (optional)
                  </label>
                  <div className="flex items-center rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-600">
                    <span className="px-3 text-xs text-muted-foreground bg-gray-50 dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 py-2.5">
                      webinarflow.in/r/
                    </span>
                    <input
                      id="slug"
                      placeholder="masterclass (leave empty for auto-generated slug)"
                      className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
                      {...form.register('slug')}
                    />
                  </div>
                </div>
              </div>

              {/* STEP 3: Free or Paid Pricing */}
              <div className="rounded-xl border border-gray-200 dark:border-neutral-700 p-4 space-y-3 bg-gray-50/70 dark:bg-neutral-800/40">
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  Step 3: Pricing & Offer
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue('is_paid', false);
                      form.setValue('price_amount', 0);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                      !form.watch('is_paid')
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm'
                        : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Free Registration
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      form.setValue('is_paid', true);
                      if (!form.getValues('price_amount')) form.setValue('price_amount', 499);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                      form.watch('is_paid')
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold shadow-sm'
                        : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-50'
                    }`}
                  >
                    <DollarSign className="h-4 w-4 text-amber-500" />
                    Paid Ticket Offer
                  </button>
                </div>

                {/* If Paid: Configure Gateway, Currency, Price */}
                {form.watch('is_paid') ? (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label htmlFor="price_amount" className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                          Ticket Price
                        </label>
                        <input
                          id="price_amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="e.g. 19.99 or 499"
                          className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all"
                          {...form.register('price_amount')}
                        />
                        {form.formState.errors.price_amount && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                            {form.formState.errors.price_amount.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="currency" className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                          Currency
                        </label>
                        <select
                          id="currency"
                          className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                          {...form.register('currency')}
                        >
                          <option value="usd">USD ($)</option>
                          <option value="inr">INR (₹)</option>
                          <option value="eur">EUR (€)</option>
                          <option value="gbp">GBP (£)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                        Payment Gateway
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => form.setValue('payment_gateway', 'stripe')}
                          className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium transition-all ${
                            form.watch('payment_gateway') !== 'razorpay'
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-sm'
                              : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-50'
                          }`}
                        >
                          <span>💳</span> Stripe Checkout
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            form.setValue('payment_gateway', 'razorpay');
                            if (form.getValues('currency') === 'usd') {
                              form.setValue('currency', 'inr');
                            }
                          }}
                          className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-xs font-medium transition-all ${
                            form.watch('payment_gateway') === 'razorpay'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-sm'
                              : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-50'
                          }`}
                        >
                          <span>⚡</span> Razorpay (UPI + QR)
                        </button>
                      </div>
                      {form.watch('payment_gateway') === 'razorpay' ? (
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          ⚡ Razorpay enables instant UPI (Google Pay, PhonePe, Paytm, BHIM) and QR Code in INR (₹)
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-500 dark:text-neutral-400">
                          Select gateway to process attendee ticket payments
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground pt-1">
                    Free registrations do not require a payment gateway. Attendees can register instantly.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-neutral-800">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMut.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                  {saveMut.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {editing ? 'Save Changes' : 'Create Landing Page (Draft)'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
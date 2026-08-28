'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Copy, Trash2, Eye, Search, Loader2, AlertCircle, X, DollarSign, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { Webinar, WebinarStatus } from '@/types/webinar';
import * as api from '@/lib/webinar-api';
import { apiErrorMessage } from '@/lib/auth-api';

// ── Zod schema for create/edit form ──────────────────────────────────────
const webinarFormSchema = z.object({
  title: z.string().min(2, 'Title is required').max(255),
  description: z.string().max(4000).optional().nullable(),
  capacity: z.preprocess((val) => (val === '' || val === null || val === undefined ? null : Number(val)), z.number().int().positive().nullable().optional()),
  is_published: z.boolean().default(false),
  status: z.enum(['draft', 'scheduled', 'live', 'completed', 'cancelled']).default('draft'),
  is_paid: z.boolean().default(false),
  price_amount: z.coerce.number().min(0).default(0),
  currency: z.string().default('usd'),
  payment_gateway: z.string().default('stripe'),
}).refine((data) => {
  if (data.is_paid && (!data.price_amount || data.price_amount <= 0)) {
    return false;
  }
  return true;
}, { message: 'Ticket price must be greater than 0 for paid webinars', path: ['price_amount'] });
type WebinarFormValues = z.infer<typeof webinarFormSchema>;

// ── Color map for status badges ─────────────────────────────────────────
const STATUS_STYLES: Record<WebinarStatus, string> = {
  draft: 'bg-neutral-800/80 text-amber-300 border-amber-600/40',
  scheduled: 'bg-neutral-800/80 text-blue-300 border-blue-600/40',
  live: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/40',
  completed: 'bg-neutral-800/80 text-neutral-300 border-neutral-700',
  cancelled: 'bg-rose-950/80 text-rose-300 border-rose-600/40',
};

// ── Modal component ─────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-900 dark:text-white shadow-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-neutral-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────
export default function WebinarsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WebinarStatus | ''>('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingWebinar, setEditingWebinar] = useState<Webinar | null>(null);

  // Form setup
  const form = useForm<WebinarFormValues>({
    resolver: zodResolver(webinarFormSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      capacity: null,
      is_published: false,
      status: 'draft',
      is_paid: false,
      price_amount: 0,
      currency: 'usd',
      payment_gateway: 'stripe',
    },
  });

  // Fetch webinars list
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['webinars', search, statusFilter],
    queryFn: () => api.listWebinars({ search: search || undefined, status: statusFilter || undefined }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  // Mutations
  const invalidate = useCallback(() => queryClient.invalidateQueries({ queryKey: ['webinars'] }), [queryClient]);

  const createMut = useMutation({
    mutationFn: (values: WebinarFormValues) => {
      const priceCents = values.is_paid && values.price_amount ? Math.round(Number(values.price_amount) * 100) : 0;
      return api.createWebinar({
        title: values.title,
        description: values.description || null,
        capacity: values.capacity ?? null,
        is_published: values.is_published,
        status: values.status,
        is_paid: values.is_paid,
        price_cents: priceCents,
        currency: values.currency || 'usd',
        payment_gateway: values.payment_gateway || 'stripe',
      });
    },
    onSuccess: (newWebinar) => {
      toast.success('Webinar created!');
      invalidate();
      closeModal();
      if (newWebinar?.id) {
        router.push(`/dashboard/webinars/${newWebinar.id}/landing-pages`);
      }
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const updateMut = useMutation({
    mutationFn: (values: WebinarFormValues) => {
      if (!editingWebinar) throw new Error('No webinar to edit');
      const priceCents = values.is_paid && values.price_amount ? Math.round(Number(values.price_amount) * 100) : 0;
      return api.updateWebinar(editingWebinar.id, {
        title: values.title,
        description: values.description || null,
        capacity: values.capacity ?? null,
        is_published: values.is_published,
        status: values.status,
        is_paid: values.is_paid,
        price_cents: priceCents,
        currency: values.currency || 'usd',
        payment_gateway: values.payment_gateway || 'stripe',
      });
    },
    onSuccess: () => {
      toast.success('Webinar updated!');
      invalidate();
      closeModal();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteWebinar(id),
    onSuccess: () => {
      toast.success('Webinar deleted');
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const duplicateMut = useMutation({
    mutationFn: (id: string) => api.duplicateWebinar(id),
    onSuccess: () => {
      toast.success('Webinar duplicated!');
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const openCreate = () => {
    form.reset({
      title: '',
      description: '',
      capacity: null,
      is_published: false,
      status: 'draft',
      is_paid: false,
      price_amount: 0,
      currency: 'usd',
      payment_gateway: 'stripe',
    });
    setEditingWebinar(null);
    setModalMode('create');
  };

  const openEdit = (w: Webinar) => {
    form.reset({
      title: w.title,
      description: w.description || '',
      capacity: w.capacity,
      is_published: w.is_published,
      status: w.status,
      is_paid: w.is_paid || false,
      price_amount: w.price_cents ? (w.price_cents / 100) : 0,
      currency: w.currency || 'usd',
      payment_gateway: w.payment_gateway || 'stripe',
    });
    setEditingWebinar(w);
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingWebinar(null);
  };

  const onSubmit = (values: WebinarFormValues) => {
    if (modalMode === 'create') createMut.mutate(values);
    else if (modalMode === 'edit') updateMut.mutate(values);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Webinars</h1>
          <p className="text-sm text-muted-foreground">{total > 0 ? `${total} webinar${total !== 1 ? 's' : ''} found` : 'Manage your webinars'}</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Webinar</Button>
      </div>

      {/* Search + status filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 pl-10 pr-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-sm transition-all"
            placeholder="Search webinars…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-sm"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as WebinarStatus | '')}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="live">Live</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Error */}
      {isError && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Failed to load webinars. {error instanceof Error ? error.message : ''}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading webinars…
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <p className="text-muted-foreground mb-4">No webinars yet.</p>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Create your first webinar</Button>
          </CardContent>
        </Card>
      )}

      {/* Webinar cards */}
      {!isLoading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((w) => (
            <Card key={w.id} className="hover:border-foreground/20 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate text-base">{w.title}</h3>
                    <Badge variant="outline" className={STATUS_STYLES[w.status]}>{w.status}</Badge>
                    {w.is_paid ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30">
                        <DollarSign className="mr-0.5 h-3 w-3" />
                        {((w.price_cents || 0) / 100).toFixed(2)} {(w.currency || 'usd').toUpperCase()}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30">Free</Badge>
                    )}
                    {w.is_published && <Badge variant="default">Published</Badge>}
                  </div>
                  {w.description && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{w.description}</p>}
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span>{w.starts_at ? new Date(w.starts_at).toLocaleDateString() : 'No date'}</span>
                    <span>{w.registration_count} registration{w.registration_count !== 1 ? 's' : ''}</span>
                    {w.capacity && <span>Cap: {w.capacity}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => window.open(`/r/${w.slug}`, '_blank')} title="View Live Landing Page"><Globe className="h-4 w-4 text-indigo-500" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => router.push(`/dashboard/webinars/${w.id}`)} title="View Details"><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs px-2 text-muted-foreground hover:text-foreground" onClick={() => router.push(`/dashboard/webinars/${w.id}/landing-pages`)} title="Manage Landing Pages">LP</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(w)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => duplicateMut.mutate(w.id)} title="Duplicate"><Copy className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => { if (confirm('Delete this webinar?')) deleteMut.mutate(w.id); }} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalMode !== null} onClose={closeModal} title={modalMode === 'create' ? 'Create Webinar' : 'Edit Webinar'}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="title" className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Title *</label>
            <input
              id="title"
              placeholder="e.g. AI Webinar Series"
              className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all"
              {...form.register('title')}
            />
            {form.formState.errors.title && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{form.formState.errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="desc" className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Description (optional)</label>
            <textarea
              id="desc"
              rows={3}
              placeholder="Brief description of your masterclass or event…"
              className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all"
              {...form.register('description')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="status" className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Status</label>
              <select
                id="status"
                className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
                {...form.register('status')}
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="capacity" className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Capacity (optional)</label>
              <input
                id="capacity"
                type="number"
                placeholder="Unlimited"
                className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all"
                {...form.register('capacity')}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 cursor-pointer select-none font-medium">
            <input type="checkbox" {...form.register('is_published')} className="rounded border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-indigo-600 focus:ring-0 h-4 w-4" />
            Publish immediately
          </label>

          {/* ── Free / Paid Webinar Selection ─────────────────────────── */}
          <div className="rounded-xl border border-gray-200 dark:border-neutral-700 p-4 space-y-3 bg-gray-50/70 dark:bg-neutral-800/40">
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Pricing Option</label>
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
                Free Webinar
              </button>
              <button
                type="button"
                onClick={() => {
                  form.setValue('is_paid', true);
                  if (!form.getValues('price_amount')) form.setValue('price_amount', 19.99);
                }}
                className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                  form.watch('is_paid')
                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold shadow-sm'
                    : 'border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 hover:bg-gray-50'
                }`}
              >
                <DollarSign className="h-4 w-4 text-amber-500" />
                Paid Webinar
              </button>
            </div>

            {/* Price, Currency, and Payment Gateway fields shown ONLY if Paid Webinar is selected */}
            {form.watch('is_paid') && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="price_amount" className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Ticket Price</label>
                    <input
                      id="price_amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 19.99 or 999"
                      className="w-full rounded-lg border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-all"
                      {...form.register('price_amount')}
                    />
                    <p className="text-[11px] text-gray-500 dark:text-neutral-400">Enter ticket amount (e.g. 19.99)</p>
                    {form.formState.errors.price_amount && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{form.formState.errors.price_amount.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="currency" className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Currency</label>
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
                  <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Payment Gateway</label>
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
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">⚡ Razorpay enables instant UPI (Google Pay, PhonePe, Paytm, BHIM) and QR Code in INR (₹)</p>
                  ) : (
                    <p className="text-[11px] text-gray-500 dark:text-neutral-400">Select gateway to process attendee ticket payments</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit">{modalMode === 'create' ? 'Create' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
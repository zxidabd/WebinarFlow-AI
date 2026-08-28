'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun, CreditCard, Key, ShieldCheck, Check, Eye, EyeOff, Save, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

import { api } from '@/lib/api';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  // Stripe State
  const [stripeEnabled, setStripeEnabled] = useState(true);
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('');
  const [showStripeSecret, setShowStripeSecret] = useState(false);

  // Razorpay State
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);

  const [saving, setSaving] = useState(false);

  // Load saved credentials on mount from backend DB and local storage
  useEffect(() => {
    setMounted(true);
    async function loadOrgKeys() {
      try {
        const orgsRes = await api.get('/organizations');
        const orgs = orgsRes.data || [];
        const org = orgs.find((o: any) => o.is_default) || orgs[0];
        if (org && org.id) {
          setActiveOrgId(org.id);
          const keysRes = await api.get(`/organizations/${org.id}/payment-keys`);
          const k = keysRes.data || {};
          if (k.stripe_publishable_key) setStripePublishableKey(k.stripe_publishable_key);
          if (k.stripe_secret_key) setStripeSecretKey(k.stripe_secret_key);
          if (k.stripe_webhook_secret) setStripeWebhookSecret(k.stripe_webhook_secret);
          if (k.stripe_enabled !== undefined) setStripeEnabled(k.stripe_enabled);

          if (k.razorpay_key_id) setRazorpayKeyId(k.razorpay_key_id);
          if (k.razorpay_key_secret) setRazorpayKeySecret(k.razorpay_key_secret);
          if (k.razorpay_enabled !== undefined) setRazorpayEnabled(k.razorpay_enabled);
          return;
        }
      } catch (err) {
        console.error('Error fetching org payment keys:', err);
      }

      // Local storage fallback
      try {
        const savedStripePk = localStorage.getItem('wf_stripe_pk') || '';
        const savedStripeSk = localStorage.getItem('wf_stripe_sk') || '';
        const savedStripeWh = localStorage.getItem('wf_stripe_wh') || '';
        const savedStripeOn = localStorage.getItem('wf_stripe_enabled') === 'true';

        const savedRzpKey = localStorage.getItem('wf_rzp_key') || '';
        const savedRzpSecret = localStorage.getItem('wf_rzp_secret') || '';
        const savedRzpOn = localStorage.getItem('wf_rzp_enabled') === 'true';

        if (savedStripePk) setStripePublishableKey(savedStripePk);
        if (savedStripeSk) setStripeSecretKey(savedStripeSk);
        if (savedStripeWh) setStripeWebhookSecret(savedStripeWh);
        setStripeEnabled(savedStripeOn !== false);

        if (savedRzpKey) setRazorpayKeyId(savedRzpKey);
        if (savedRzpSecret) setRazorpayKeySecret(savedRzpSecret);
        setRazorpayEnabled(savedRzpOn);
      } catch (e) {
        console.error(e);
      }
    }

    loadOrgKeys();
  }, []);

  const handleSavePaymentKeys = async () => {
    setSaving(true);
    try {
      // 1. Save to local storage for local client caching
      localStorage.setItem('wf_stripe_pk', stripePublishableKey);
      localStorage.setItem('wf_stripe_sk', stripeSecretKey);
      localStorage.setItem('wf_stripe_wh', stripeWebhookSecret);
      localStorage.setItem('wf_stripe_enabled', String(stripeEnabled));

      localStorage.setItem('wf_rzp_key', razorpayKeyId);
      localStorage.setItem('wf_rzp_secret', razorpayKeySecret);
      localStorage.setItem('wf_rzp_enabled', String(razorpayEnabled));

      // 2. Persist to Backend Organization database
      let targetOrgId = activeOrgId;
      if (!targetOrgId) {
        const orgsRes = await api.get('/organizations');
        const orgs = orgsRes.data || [];
        const org = orgs.find((o: any) => o.is_default) || orgs[0];
        if (org && org.id) targetOrgId = org.id;
      }

      if (targetOrgId) {
        await api.patch(`/organizations/${targetOrgId}/payment-keys`, {
          stripe_enabled: stripeEnabled,
          stripe_publishable_key: stripePublishableKey,
          stripe_secret_key: stripeSecretKey,
          stripe_webhook_secret: stripeWebhookSecret,
          razorpay_enabled: razorpayEnabled,
          razorpay_key_id: razorpayKeyId,
          razorpay_key_secret: razorpayKeySecret,
        });
      }

      toast.success('Payment gateway credentials saved successfully to your workspace!');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.detail || 'Failed to save payment keys');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <div className="animate-pulse">
          <div className="h-32 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-5xl animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings & Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure application preferences, payment gateways, and API keys.
        </p>
      </div>

      {/* Payment Gateways Section */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4a6cf7]/10 text-[#4a6cf7]">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-base font-semibold">Payment Gateways & Keys</CardTitle>
                <CardDescription className="text-xs">
                  Connect Stripe or Razorpay to accept paid webinar ticket registrations live.
                </CardDescription>
              </div>
            </div>

            <Button
              onClick={handleSavePaymentKeys}
              disabled={saving}
              className="bg-[#4a6cf7] hover:bg-[#3b5ce5] text-white flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save API Keys'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-8 pt-6">
          {/* Stripe Configuration */}
          <div className="space-y-4 rounded-xl border border-slate-200/80 p-5 bg-slate-50/50">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-7 w-16 rounded bg-[#635bff] flex items-center justify-center font-bold text-white text-xs tracking-wider">
                  stripe
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Stripe Integration</h3>
                  <p className="text-xs text-slate-500">Accept international credit cards and Apple Pay</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={stripeEnabled}
                  onChange={(e) => setStripeEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4a6cf7]"></div>
              </label>
            </div>

            {stripeEnabled && (
              <div className="grid gap-4 md:grid-cols-2 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Stripe Publishable Key (<code className="text-[11px] text-slate-500">pk_live_...</code> or <code className="text-[11px] text-slate-500">pk_test_...</code>)
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="pk_test_51Nx..."
                      value={stripePublishableKey}
                      onChange={(e) => setStripePublishableKey(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-white text-black focus:outline-none focus:border-[#4a6cf7]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Stripe Secret Key (<code className="text-[11px] text-slate-500">sk_live_...</code>)
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type={showStripeSecret ? 'text' : 'password'}
                      placeholder="sk_test_51Nx..."
                      value={stripeSecretKey}
                      onChange={(e) => setStripeSecretKey(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 text-xs border border-slate-200 rounded-lg bg-white text-black focus:outline-none focus:border-[#4a6cf7]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStripeSecret(!showStripeSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showStripeSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Stripe Webhook Endpoint Secret (<code className="text-[11px] text-slate-500">whsec_...</code>)
                  </label>
                  <input
                    type="text"
                    placeholder="whsec_..."
                    value={stripeWebhookSecret}
                    onChange={(e) => setStripeWebhookSecret(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-black focus:outline-none focus:border-[#4a6cf7]"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Set your Stripe webhook destination to: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">http://localhost:8000/api/v1/payments/webhook</code>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Razorpay Configuration */}
          <div className="space-y-4 rounded-xl border border-slate-200/80 p-5 bg-slate-50/50">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-7 w-20 rounded bg-[#0c2340] flex items-center justify-center font-bold text-sky-400 text-xs tracking-wider">
                  Razorpay
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Razorpay Integration</h3>
                  <p className="text-xs text-slate-500">Accept UPI, Netbanking, and domestic Indian payment cards</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={razorpayEnabled}
                  onChange={(e) => setRazorpayEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4a6cf7]"></div>
              </label>
            </div>

            {razorpayEnabled && (
              <div className="grid gap-4 md:grid-cols-2 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Razorpay Key ID (<code className="text-[11px] text-slate-500">rzp_live_...</code>)
                  </label>
                  <input
                    type="text"
                    placeholder="rzp_test_..."
                    value={razorpayKeyId}
                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white text-black focus:outline-none focus:border-[#4a6cf7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Razorpay Key Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showRazorpaySecret ? 'text' : 'password'}
                      placeholder="Secret Key"
                      value={razorpayKeySecret}
                      onChange={(e) => setRazorpayKeySecret(e.target.value)}
                      className="w-full pl-3 pr-10 py-2 text-xs border border-slate-200 rounded-lg bg-white text-black focus:outline-none focus:border-[#4a6cf7]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showRazorpaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Appearance & Theme</CardTitle>
          <CardDescription className="text-xs">Customize the dashboard color mode</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex gap-3">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="flex items-center gap-2"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="flex items-center gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

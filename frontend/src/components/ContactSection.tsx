'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';

const TOPICS = [
  'General Inquiry / Support',
  'Webinar & Funnel Setup',
  'AI Agent Assistance',
  'Billing & Subscriptions',
  'Technical Issue',
  'Partnership / Other',
];

export default function ContactSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@webinarflow.in');
    setCopiedEmail(true);
    toast.success('Email copied to clipboard!');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      let res: Response;
      try {
        res = await fetch(`${API_BASE_URL}/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            subject: topic,
            message: message.trim(),
          }),
        });
      } catch {
        // If cold start or network glitch, wait 1.5s and retry once
        await new Promise((r) => setTimeout(r, 1500));
        res = await fetch(`${API_BASE_URL}/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            subject: topic,
            message: message.trim(),
          }),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 404) {
          throw new Error('Backend is currently updating. Please try again in 30 seconds or email support@webinarflow.in.');
        }
        throw new Error(errData?.detail || 'Failed to send message. Please try again.');
      }

      setSubmitted(true);
      toast.success('Message sent! Check your inbox for confirmation.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not send message. Please email support@webinarflow.in directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="relative scroll-mt-24 py-24 sm:py-32 bg-black text-white overflow-hidden">
      {/* Subtle ambient glows */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[800px] rounded-full bg-[radial-gradient(circle_at_center,rgba(133,37,51,0.08)_0%,transparent_70%)] blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-1.5 backdrop-blur-md mb-4 shadow-[0_0_20px_rgba(255,255,255,0.02)]">
            <Sparkles className="h-3.5 w-3.5 text-[#f8a5b2]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-300">
              Support & Inquiries
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Have a Question?{' '}
            <span className="bg-gradient-to-r from-white via-[#fbcfe8] to-[#f43f5e] bg-clip-text text-transparent">
              We&apos;re Here to Help.
            </span>
          </h2>
          <p className="mt-4 text-sm sm:text-base leading-relaxed text-gray-400">
            Send us a message below with your query or feedback. Our team receives it directly in our
            business inbox and responds quickly.
          </p>
        </div>

        {/* Content Grid */}
        <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 items-start">
          {/* Left Column: Direct Support Details */}
          <div className="lg:col-span-5 space-y-6">
            {/* Primary Email Card */}
            <div className="rounded-3xl border border-white/[0.1] bg-[#0d0d0f]/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 h-32 w-32 bg-[#852533]/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#852533] to-[#551827] text-white shadow-lg shadow-[#852533]/30 border border-[#a63344]/30">
                <Mail className="h-6 w-6" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-white">Direct Business Support</h3>
              <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
                Prefer email? Reach our executive support team directly:
              </p>

              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5">
                <span className="font-mono text-xs sm:text-sm font-semibold text-white truncate">
                  support@webinarflow.in
                </span>
                <button
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors shrink-0"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Guarantees / Badges */}
              <div className="mt-6 space-y-3 pt-6 border-t border-white/[0.08]">
                <div className="flex items-center gap-3 text-xs text-gray-300">
                  <Clock className="h-4 w-4 text-[#f8a5b2] shrink-0" />
                  <span>Average response time: <strong>Under 2 hours</strong></span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>24/7 dedicated support for all creators & users</span>
                </div>
              </div>
            </div>

            {/* Help Topics Box */}
            <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 text-xs text-gray-400 space-y-2.5">
              <p className="font-semibold text-white text-sm mb-2">What we can help you with:</p>
              <p>• Setting up your first automated webinar funnel</p>
              <p>• Connecting custom domains & Stripe / Razorpay gateways</p>
              <p>• Tailoring AI Agent prompts & WhatsApp sequences</p>
              <p>• Account upgrades, enterprise plans & custom limits</p>
            </div>
          </div>

          {/* Right Column: Query Submission Form */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-white/[0.1] bg-[#0d0d0f]/95 p-6 sm:p-10 backdrop-blur-2xl shadow-2xl relative">
              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-xl">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Message Received!</h3>
                  <p className="max-w-md mx-auto text-xs sm:text-sm text-gray-400 leading-relaxed">
                    Thank you for reaching out, <strong>{name}</strong>. Your query has been delivered
                    directly to our support inbox. We have also sent a confirmation acknowledgment to{' '}
                    <span className="text-white font-medium">{email}</span>.
                  </p>
                  <div className="pt-4">
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setMessage('');
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-5 py-2.5 text-xs font-semibold text-white transition-all"
                    >
                      Send Another Query
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="border-b border-white/[0.08] pb-4">
                    <h3 className="text-xl font-bold text-white">Send Us a Query</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Fill out the form below and we will get back to you directly via email.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Your Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full rounded-xl border border-white/[0.1] bg-black/60 px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#a63344] focus:outline-none focus:ring-1 focus:ring-[#a63344] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Your Email <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full rounded-xl border border-white/[0.1] bg-black/60 px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#a63344] focus:outline-none focus:ring-1 focus:ring-[#a63344] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Topic / Category
                    </label>
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.1] bg-black/60 px-3.5 py-2.5 text-xs text-white focus:border-[#a63344] focus:outline-none focus:ring-1 focus:ring-[#a63344] transition-all"
                    >
                      {TOPICS.map((t) => (
                        <option key={t} value={t} className="bg-[#18181b] text-white">
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Message / Query <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="How can we help you today? Please describe your question or issue in detail..."
                      className="w-full rounded-xl border border-white/[0.1] bg-black/60 px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:border-[#a63344] focus:outline-none focus:ring-1 focus:ring-[#a63344] transition-all resize-y"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-gradient-to-r from-[#6b1e28] to-[#852533] hover:from-[#852533] hover:to-[#a63344] py-3 text-xs font-semibold text-white shadow-lg shadow-[#852533]/30 border border-[#a63344]/50 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Sending message to support...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] text-gray-500">
                    We respect your privacy. Queries are handled directly by our support staff.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

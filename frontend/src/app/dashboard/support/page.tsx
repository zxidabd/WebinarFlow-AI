'use client';

import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle2, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { API_BASE_URL } from '@/lib/api';

export default function SupportPage() {
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Pre-fill name and email from authenticated user
  useEffect(() => {
    if (user?.full_name && !name) {
      setName(user.full_name);
    }
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@webinarflow.in');
    setCopiedEmail(true);
    toast.success('Copied support@webinarflow.in to clipboard!');
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
            subject: `Dashboard Support Request from ${name.trim()}`,
            message: message.trim(),
          }),
        });
      } catch {
        // Retry once on network timeout / cold start
        await new Promise((r) => setTimeout(r, 1200));
        res = await fetch(`${API_BASE_URL}/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            subject: `Dashboard Support Request from ${name.trim()}`,
            message: message.trim(),
          }),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.detail || 'Failed to send message. Please try again.');
      }

      setSubmitted(true);
      setMessage('');
      toast.success('Your message has been sent to our support team!');
    } catch (err: any) {
      toast.error(err?.message || 'Could not send message. Please email support@webinarflow.in directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-8 animate-in fade-in duration-300">
      {/* Outer Header */}
      <div className="mx-auto max-w-xl text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Contact Us
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Reach out to us, and our team will get back to you promptly
        </p>
      </div>

      {/* Maroon Box Container matching Dashboard Hero */}
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#5a1a23]/60 bg-gradient-to-br from-[#1c080b] via-[#350d14] to-[#4d151e] p-6 sm:p-9 text-white shadow-2xl">
        {/* Subtle grid pattern */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_40%,#000_60%,transparent_100%)]"
        />

        {/* Ambient burgundy glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#962534]/35 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-[#7a1b28]/35 blur-3xl"
        />

        <div className="relative z-10 flex flex-col items-center">
          {/* Business email pill / chip */}
          <button
            type="button"
            onClick={handleCopyEmail}
            title="Click to copy business email"
            className="group mb-7 inline-flex items-center gap-2 rounded-full border border-[#7a222f]/60 bg-[#250a0f]/90 px-4 py-1.5 text-xs font-medium text-[#f8d7dc] transition-all hover:border-[#a63344] hover:bg-[#340e15] hover:text-white hover:shadow-[0_0_15px_rgba(244,63,94,0.2)]"
          >
            <Mail className="h-3.5 w-3.5 text-[#f8a5b2] group-hover:scale-110 transition-transform" />
            <span className="font-mono text-[13px]">support@webinarflow.in</span>
            {copiedEmail ? (
              <Check className="h-3.5 w-3.5 text-emerald-400 ml-1" />
            ) : (
              <Copy className="h-3 w-3 text-[#f8a5b2]/60 group-hover:text-[#f8a5b2] ml-1" />
            )}
          </button>

          {submitted ? (
            <div className="w-full text-center py-6 px-4 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-white">Message Received!</h3>
              <p className="text-xs sm:text-sm text-[#f8d7dc]/90 max-w-sm mx-auto leading-relaxed">
                Thank you for contacting us. We&apos;ve routed your inquiry to our support team and sent a confirmation receipt to{' '}
                <strong className="text-white">{email}</strong>.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-neutral-200 transition-all shadow-md"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-5">
              {/* Name Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#f8d7dc]">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Satoshi Nakamoto"
                  className="w-full rounded-xl border border-[#7a222f]/50 bg-[#140508]/80 px-4 py-3 text-sm text-white placeholder:text-zinc-500 transition-all focus:border-[#f43f5e] focus:outline-none focus:ring-1 focus:ring-[#f43f5e]"
                />
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#f8d7dc]">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="satoshi@example.com"
                  className="w-full rounded-xl border border-[#7a222f]/50 bg-[#140508]/80 px-4 py-3 text-sm text-white placeholder:text-zinc-500 transition-all focus:border-[#f43f5e] focus:outline-none focus:ring-1 focus:ring-[#f43f5e]"
                />
              </div>

              {/* Message Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#f8d7dc]">
                  How we can help?
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your message here..."
                  className="w-full rounded-xl border border-[#7a222f]/50 bg-[#140508]/80 px-4 py-3 text-sm text-white placeholder:text-zinc-500 transition-all focus:border-[#f43f5e] focus:outline-none focus:ring-1 focus:ring-[#f43f5e] resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-full bg-white py-3.5 px-6 text-sm font-semibold text-black shadow-lg transition-all hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-black" />
                    <span>Sending Message...</span>
                  </>
                ) : (
                  <>
                    <span>Send Message</span>
                    <span className="text-base font-bold">➔</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

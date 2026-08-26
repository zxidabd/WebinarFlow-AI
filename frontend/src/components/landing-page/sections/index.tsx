/** Reusable Landing Page Section Components */

import { useState, useEffect } from 'react';

// ── Utility ──────────────────────────────────────────────────────────────

function countdownTime(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return { days: '00', hours: '00', minutes: '00', seconds: '00' };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { days: String(d).padStart(2, '0'), hours: String(h).padStart(2, '0'), minutes: String(m).padStart(2, '0'), seconds: String(s).padStart(2, '0') };
}

function formatPriceHelper(cents?: number, cur?: string) {
  if (!cents || cents <= 0) return 'Free';
  const amount = (cents / 100).toFixed(2);
  const symbols: Record<string, string> = { usd: '$', inr: '₹', eur: '€', gbp: '£' };
  return `${symbols[cur || 'usd'] || (cur || 'usd').toUpperCase() + ' '}${amount}`;
}

export function getBgStyle(data: any, fallbackClass: string = 'bg-white') {
  const bg = data.bg_color || data.background_color || data.background_gradient;
  if (!bg) return { className: fallbackClass, style: {} };
  const isHexOrRgb = bg.startsWith('#') || bg.startsWith('rgb');
  if (isHexOrRgb) {
    return { className: '', style: { backgroundColor: bg } };
  }
  if (bg.startsWith('from-') || bg.includes('gradient')) {
    return { className: `bg-gradient-to-r ${bg}`, style: {} };
  }
  return { className: bg, style: {} };
}

export function HeroSection({ data, isPaid, priceCents, currency }: { data: any; isPaid?: boolean; priceCents?: number; currency?: string }) {
  const bg = getBgStyle(data, 'bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500');

  const priceDisplay = isPaid && priceCents && priceCents > 0
    ? formatPriceHelper(priceCents, currency)
    : (data.price || null);

  const ctaLabel = isPaid && priceCents && priceCents > 0
    ? `Buy Ticket — ${priceDisplay}`
    : (data.cta_text || 'Register Now');

  const heroImg = data.course_image || data.hero_image;
  const headline = data.headline || data.course_headline || data.title || 'Webinar Masterclass';
  const subtitle = data.subtitle || data.description || '';

  return (
    <section className={`relative overflow-hidden ${bg.className} px-6 py-20 md:py-32 text-white`} style={bg.style}>
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="space-y-6">
            {data.logo_url && <img src={data.logo_url} alt="" className="h-8 brightness-0 invert" />}
            <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">{headline}</h1>
            {subtitle && <p className="text-lg text-white/80 md:text-xl">{subtitle}</p>}
            <div className="flex flex-wrap items-center gap-4">
              <a href={data.cta_link || '#register'} className="inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-lg hover:shadow-xl transition-all">{ctaLabel}</a>
              {priceDisplay ? (
                <span className="inline-flex items-center rounded-full bg-amber-400/20 border border-amber-300/40 px-4 py-1.5 text-sm font-semibold text-amber-200">
                  🎟️ {priceDisplay}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-emerald-400/20 border border-emerald-300/40 px-4 py-1 text-sm font-medium text-emerald-200">
                  🎉 Free Access
                </span>
              )}
            </div>
          </div>
          {heroImg && (
            <div className="relative">
              <img src={heroImg} alt="Hero" className="rounded-2xl shadow-2xl max-h-96 w-full object-cover" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Speakers Section ─────────────────────────────────────────────────────────

export function SpeakersSection({ data }: { data: any }) {
  if (!data.speakers?.length) return null;
  const bg = getBgStyle(data, 'bg-white');
  return (
    <section className={`px-6 py-16 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-6xl text-center">
        <h2 className="text-3xl font-bold text-gray-900">{data.title}</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {data.speakers.map((s: any, i: number) => (
            <div key={i} className="rounded-2xl border border-gray-100 p-6 text-center shadow-sm hover:shadow-md transition-shadow bg-white">
              <img src={s.avatar || '/placeholder-avatar.svg'} alt={s.name} className="mx-auto h-20 w-20 rounded-full object-cover" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">{s.name}</h3>
              <p className="text-sm text-gray-500">{s.title}</p>
              {s.company && <p className="text-xs text-gray-400">{s.company}</p>}
              <p className="mt-3 text-sm text-gray-600">{s.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Stats Section ─────────────────────────────────────────────────────────────

export function StatsSection({ data }: { data: any }) {
  if (!data.stats?.length) return null;
  const bg = getBgStyle(data, 'bg-gray-50');
  return (
    <section className={`px-6 py-12 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {data.stats.map((s: any, i: number) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold text-indigo-600 md:text-4xl">{s.value}</div>
              <div className="mt-1 text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Logos Section ─────────────────────────────────────────────────────────────

export function LogosSection({ data }: { data: any }) {
  if (!data.logos?.length && !data.title) return null;
  const bg = getBgStyle(data, 'bg-white');
  return (
    <section className={`px-6 py-12 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-6xl text-center">
        {data.title && <p className="mb-6 text-sm font-medium uppercase tracking-wider text-gray-400">{data.title}</p>}
        <div className="flex flex-wrap items-center justify-center gap-8 opacity-50">
          {data.logos?.map((l: any, i: number) => (
            <img key={i} src={l.src} alt={l.alt || ''} className="h-8" />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Benefits Section ──────────────────────────────────────────────────────────

export function BenefitsSection({ data }: { data: any }) {
  if (!data.benefits?.length) return null;
  const bg = getBgStyle(data, 'bg-white');
  return (
    <section className={`px-6 py-16 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">{data.title}</h2>
          {data.subtitle && <p className="mt-2 text-gray-500">{data.subtitle}</p>}
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {data.benefits.map((b: any, i: number) => (
            <div key={i} className="rounded-xl border border-gray-100 p-6 text-center shadow-sm hover:shadow-md transition-shadow bg-white">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 text-xl">{b.icon?.charAt(0) || '○'}</div>
              <h3 className="mt-4 font-semibold text-gray-900">{b.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Agenda Section ─────────────────────────────────────────────────────────────

export function AgendaSection({ data }: { data: any }) {
  if (!data.items?.length) return null;
  const bg = getBgStyle(data, 'bg-gray-50');
  return (
    <section className={`px-6 py-16 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-bold text-gray-900">{data.title}</h2>
        <div className="mt-8 space-y-4">
          {data.items.map((item: any, i: number) => (
            <div key={i} className="flex items-start gap-4 rounded-xl bg-white p-5 shadow-sm">
              <div className="whitespace-nowrap rounded-lg bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">{item.time}</div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
                {item.speaker && <p className="text-xs text-gray-400">{item.speaker}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials Section ─────────────────────────────────────────────────────

export function TestimonialsSection({ data }: { data: any }) {
  if (!data.testimonials?.length) return null;
  const bg = getBgStyle(data, 'bg-white');
  return (
    <section className={`px-6 py-16 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-gray-900">{data.title}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.testimonials.map((t: any, i: number) => (
            <div key={i} className="rounded-xl border border-gray-100 p-6 shadow-sm bg-white">
              <div className="flex text-yellow-400 text-sm">{t.rating && '★'.repeat(Number(t.rating))}</div>
              <p className="mt-3 text-sm italic text-gray-600">{'“'}{t.quote}{'”'}</p>
              <div className="mt-4 flex items-center gap-3">
                {t.avatar && <img src={t.avatar} alt={t.name} className="h-10 w-10 rounded-full object-cover" />}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  {t.title && <p className="text-xs text-gray-400">{t.title}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ Section ───────────────────────────────────────────────────────────────

export function FAQSection({ data }: { data: any }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!data.items?.length) return null;
  const bg = getBgStyle(data, 'bg-gray-50');
  return (
    <section className={`px-6 py-16 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-3xl font-bold text-gray-900">{data.title}</h2>
        <div className="mt-8 space-y-3">
          {data.items.map((item: any, i: number) => (
            <div key={i} className="rounded-xl bg-white shadow-sm">
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between px-6 py-4 text-left">
                <span className="font-medium text-gray-900">{item.question}</span>
                <span className={`text-gray-400 transition-transform ${open === i ? 'rotate-180' : ''}`}>▼</span>
              </button>
              {open === i && <div className="px-6 pb-4 text-sm text-gray-600">{item.answer}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Countdown Section ─────────────────────────────────────────────────────────

export function CountdownSection({ data }: { data: any }) {
  const [time, setTime] = useState(() => countdownTime(data.end_date));

  useEffect(() => {
    if (data.enabled !== 'true' || !data.end_date) return;
    const interval = setInterval(() => setTime(countdownTime(data.end_date)), 1000);
    return () => clearInterval(interval);
  }, [data.enabled, data.end_date]);

  if (data.enabled !== 'true') return null;
  const bg = getBgStyle(data, 'bg-indigo-600');

  return (
    <section className={`px-6 py-12 text-white text-center ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-3xl">
        <p className="text-lg font-medium">{data.message}</p>
        <div className="mt-4 flex justify-center gap-4 text-center">
          {[
            { label: 'Days', value: time.days },
            { label: 'Hours', value: time.hours },
            { label: 'Minutes', value: time.minutes },
            { label: 'Seconds', value: time.seconds },
          ].map((t) => (
            <div key={t.label} className="rounded-xl bg-white/10 px-6 py-3">
              <div className="text-3xl font-bold md:text-4xl">{t.value}</div>
              <div className="text-xs text-white/70">{t.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Register Section ─────────────────────────────────────────────────────────

export function RegisterSection({
  data,
  webinarId,
  onRegister,
  isPaid,
  priceCents,
  currency,
  paymentGateway,
}: {
  data: any;
  webinarId?: string;
  onRegister?: (email: string, name?: string) => Promise<any> | void;
  isPaid?: boolean;
  priceCents?: number;
  currency?: string;
  paymentGateway?: string;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (cents: number, cur: string) => {
    const amount = (cents / 100).toFixed(2);
    const symbols: Record<string, string> = { usd: '$', inr: '₹', eur: '€', gbp: '£' };
    return `${symbols[cur] || cur.toUpperCase() + ' '}${amount}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (onRegister) {
        const res: any = await onRegister(email, name || undefined);
        if (res?.checkout_url) {
          window.location.href = res.checkout_url;
          return;
        }
        if (isPaid && !res?.verified) {
          throw new Error('Payment was not completed. Registration is pending payment.');
        }
      } else if (isPaid) {
        setError('This is a preview. To test payment and registration, publish the landing page and use the live page.');
        return;
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Registration / payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const bg = getBgStyle(data, 'bg-gradient-to-b from-gray-50 to-white');

  if (submitted) {
    return (
      <section id="register" className={`px-6 py-16 ${bg.className}`} style={bg.style}>
        <div className="mx-auto max-w-md text-center">
          <div className="rounded-2xl bg-green-50 p-8 text-green-800 border border-green-200 shadow-sm">
            <p className="text-3xl">✓</p>
            <p className="mt-2 text-lg font-bold text-green-900">
              {data.success_message || "You're registered!"}
            </p>
            <p className="mt-1 text-xs text-green-700">
              Check your inbox for the event details.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const priceFormatted = isPaid && priceCents && priceCents > 0 ? formatPrice(priceCents, currency || 'usd') : null;

  return (
    <section id="register" className={`px-6 py-16 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-md">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">{data.title || 'Register Now'}</h3>
            {priceFormatted && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-300">
                🎟️ {priceFormatted}
              </span>
            )}
          </div>

          {isPaid && priceFormatted && (
            <p className="mt-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              🔒 <strong>Paid Webinar:</strong> Complete registration and payment via {paymentGateway === 'razorpay' ? 'Razorpay' : 'Stripe'} to secure your ticket.
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="email"
              required
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none bg-white text-black"
            />
            {data.collect_name !== 'false' && (
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none bg-white text-black"
              />
            )}
            {data.collect_company === 'true' && (
              <input
                type="text"
                placeholder="Company"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none bg-white text-black"
              />
            )}

            {isPaid && priceFormatted ? (
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-amber-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? 'Processing…' : `Register Now — ${priceFormatted}`}
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-60"
              >
                {loading ? 'Registering…' : (data.cta_text || 'Register')}
              </button>
            )}
            {error && <p className="text-xs text-rose-500 font-medium text-center">{error}</p>}
          </form>
        </div>
      </div>
    </section>
  );
}

// ── Footer Section ─────────────────────────────────────────────────────────────

export function FooterSection({ data }: { data: any }) {
  const bg = getBgStyle(data, 'bg-white');
  return (
    <footer className={`border-t border-gray-100 px-6 py-8 text-center text-sm text-gray-400 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-6xl">
        <p>{data.text}</p>
        {data.links && (
          <div className="mt-2 flex justify-center gap-4">
            {data.links.split(',').map((link: string, i: number) => (
              <a key={i} href="#" className="hover:text-gray-600 transition-colors">{link.trim()}</a>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}

// ── Instructor Section ─────────────────────────────────────────────────────────

export function InstructorSection({ data }: { data: any }) {
  if (!data.name) return null;
  const bg = getBgStyle(data, 'bg-white');
  return (
    <section className={`px-6 py-16 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold text-gray-900">{data.title}</h2>
        <div className="mt-10 flex flex-col items-center gap-6 md:flex-row">
          <img src={data.avatar || '/placeholder-avatar.svg'} alt={data.name} className="h-32 w-32 rounded-full object-cover shadow-lg" />
          <div>
            <h3 className="text-xl font-bold text-gray-900">{data.name}</h3>
            <p className="text-sm text-indigo-600">{data.title_role}</p>
            <p className="mt-3 text-sm text-gray-600">{data.bio}</p>
            {data.credentials && <p className="mt-2 text-xs text-gray-400">{data.credentials}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Outcomes Section ──────────────────────────────────────────────────────────

export function OutcomesSection({ data }: { data: any }) {
  if (!data.outcomes?.length) return null;
  const bg = getBgStyle(data, 'bg-gray-50');
  return (
    <section className={`px-6 py-16 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl font-bold text-gray-900">{data.title}</h2>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {data.outcomes.map((o: any, i: number) => (
            <li key={i} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm">
              <span className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 text-xs text-purple-700">✓</span>
              <span className="text-sm text-gray-700">{o.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ── Curriculum Section ─────────────────────────────────────────────────────────

export function CurriculumSection({ data }: { data: any }) {
  if (!data.modules?.length) return null;
  const bg = getBgStyle(data, 'bg-white');
  return (
    <section className={`px-6 py-16 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-4xl">
        <h2 className="text-3xl font-bold text-gray-900">{data.title}</h2>
        {data.subtitle && <p className="mt-2 text-gray-500">{data.subtitle}</p>}
        <div className="mt-8 space-y-3">
          {data.modules.map((m: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow bg-white">
              <div>
                <h4 className="font-semibold text-gray-900">{m.title}</h4>
                <p className="text-sm text-gray-500">{m.lessons} · {m.duration}</p>
              </div>
              <span className="text-gray-300">→</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Certificate Section ────────────────────────────────────────────────────────

export function CertificateSection({ data }: { data: any }) {
  if (!data.title) return null;
  const bg = getBgStyle(data, 'bg-gray-50');
  return (
    <section className={`px-6 py-16 text-center ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold text-gray-900">{data.title}</h2>
        <p className="mt-2 text-gray-500">{data.description}</p>
        {data.image && <img src={data.image} alt="Certificate" className="mx-auto mt-8 max-w-md rounded-xl shadow-lg" />}
      </div>
    </section>
  );
}

// ── Schedule Section ──────────────────────────────────────────────────────────

export function ScheduleSection({ data }: { data: any }) {
  if (!data.items?.length) return null;
  const bg = getBgStyle(data, 'bg-gray-50');
  return (
    <section className={`px-6 py-16 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-4xl">
        <h2 className="text-3xl font-bold text-gray-900">{data.title}</h2>
        {data.date && <p className="mt-1 text-gray-500">{data.date}</p>}
        <div className="mt-8 space-y-3">
          {data.items.map((item: any, i: number) => (
            <div key={i} className="flex items-start gap-4 rounded-xl bg-white p-5 shadow-sm">
              <div className="whitespace-nowrap rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">{item.time}</div>
              <div>
                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                {item.speaker && <p className="text-xs text-gray-400">By: {item.speaker}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Case Study Section ─────────────────────────────────────────────────────────

export function CaseStudySection({ data }: { data: any }) {
  if (!data.studies?.length) return null;
  const bg = getBgStyle(data, 'bg-white');
  return (
    <section className={`px-6 py-16 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold text-gray-900">{data.title}</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.studies.map((s: any, i: number) => (
            <div key={i} className="rounded-xl border border-gray-100 p-6 shadow-sm bg-white">
              <div className="text-2xl font-bold text-blue-600">{s.metric}</div>
              <p className="mt-2 text-sm italic text-gray-600">{'“'}{s.quote}{'”'}</p>
              <p className="mt-3 text-sm font-semibold text-gray-900">{s.company}</p>
              {s.industry && <p className="text-xs text-gray-400">{s.industry}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Navbar Section ────────────────────────────────────────────────────────

export function NavbarSection({ data, isPaid, priceCents, currency }: { data: any; isPaid?: boolean; priceCents?: number; currency?: string }) {
  const items = data.links || ['About', 'FAQ', 'Register'];
  const lg = data.logo_text || 'WebinarFlow';
  const priceDisplay = isPaid && priceCents && priceCents > 0 ? formatPriceHelper(priceCents, currency) : null;
  const ctaText = priceDisplay ? `Buy Ticket (${priceDisplay})` : (data.cta_text || 'Register');
  const bg = getBgStyle(data, 'bg-white/95');

  return (
    <nav className={`sticky top-0 z-50 border-b border-gray-100 backdrop-blur-sm ${bg.className}`} style={bg.style}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#" className="text-xl font-bold text-gray-900">{lg}</a>
        <div className="hidden md:flex items-center gap-6">
          {items.map((lk: string, i: number) => (
            <a key={i} href={`#${lk.replace(/\s+/g,'').toLowerCase()}`} className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">{lk}</a>
          ))}
          {priceDisplay && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              {priceDisplay}
            </span>
          )}
          <a href={data.cta_link || '#register'} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition-colors">{ctaText}</a>
        </div>
      </div>
    </nav>
  );
}

// ── Hero v2 (image/video bg + stats + event meta) ─────────────────────────

export function HeroV2Section({ data, isPaid, priceCents, currency }: { data: any; isPaid?: boolean; priceCents?: number; currency?: string }) {
  const hasMedia = data.background_image || data.background_video;
  const priceDisplay = isPaid && priceCents && priceCents > 0 ? formatPriceHelper(priceCents, currency) : (data.price || null);
  const ctaText = isPaid && priceCents && priceCents > 0 ? `Buy Ticket — ${priceDisplay}` : (data.cta_text || 'Register Now');
  const bg = getBgStyle(data, 'bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500');

  return (
    <section id="hero" className="relative overflow-hidden px-6 py-24 md:py-36 text-white" style={bg.style}>
      {data.background_image && !data.background_video && (
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${data.background_image})` }} />
      )}
      {data.background_video && (
        <video autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover">
          <source src={data.background_video} type="video/mp4" />
        </video>
      )}
      {!hasMedia && <div className={`absolute inset-0 ${bg.className}`} style={bg.style} />}
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative mx-auto max-w-4xl text-center">
        {priceDisplay ? (
          <span className="inline-block rounded-full bg-amber-400/20 border border-amber-300/40 px-4 py-1.5 text-sm font-semibold text-amber-200 mb-4">
            🎟️ Ticket Price: {priceDisplay}
          </span>
        ) : (
          data.badge && <span className="inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-medium mb-4">{data.badge}</span>
        )}
        <h1 className="text-4xl font-bold leading-tight md:text-6xl">{data.headline}</h1>
        <p className="mt-4 text-lg text-white/80 md:text-xl">{data.subtitle}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-white/70">
          {data.date && <span>📅 {data.date}</span>}
          {data.time && <span>🕒 {data.time}</span>}
          {data.registrations && <span>👥 {data.registrations}</span>}
        </div>
        <div className="mt-8">
          <a href={data.cta_link || '#register'} className="inline-flex items-center rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold shadow-lg hover:bg-indigo-700 transition-colors">{ctaText}</a>
        </div>
      </div>
    </section>
  );
}

// ── Speaker v2 (with social links) ────────────────────────────────────────

export function SpeakersV2Section({ data }: { data: any }) {
  if (!data.speakers?.length) return null;
  const bg = getBgStyle(data, 'bg-white');
  return (
    <section id="speaker" className={`px-6 py-16 ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-gray-900">{data.title || 'Meet the Speaker'}</h2>
        <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {data.speakers.map((s: any, i: number) => (
            <div key={i} className="rounded-2xl border border-gray-100 p-8 text-center shadow-sm hover:shadow-md transition-shadow bg-white">
              <img src={s.avatar || '/placeholder-avatar.svg'} alt={s.name} className="mx-auto h-24 w-24 rounded-full object-cover ring-4 ring-gray-50" />
              <h3 className="mt-4 text-xl font-bold text-gray-900">{s.name}</h3>
              <p className="text-sm text-indigo-600">{s.title_role || s.title}</p>
              <p className="mt-3 text-sm text-gray-600">{s.bio}</p>
              {(s.twitter || s.linkedin || s.website) && (
                <div className="mt-4 flex justify-center gap-4">
                  {s.twitter && <a href={s.twitter} className="text-gray-400 hover:text-blue-500 text-lg" target="_blank">𝕏</a>}
                  {s.linkedin && <a href={s.linkedin} className="text-gray-400 hover:text-blue-700 text-lg" target="_blank">in</a>}
                  {s.website && <a href={s.website} className="text-gray-400 hover:text-gray-600 text-lg" target="_blank">🔗</a>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Sticky Registration Panel ─────────────────────────────────────────────

export function StickyRegisterSection({
  data,
  webinarId,
  onRegister,
  isPaid,
  priceCents,
  currency,
  paymentGateway,
}: {
  data: any;
  webinarId?: string;
  onRegister?: (email: string, name?: string) => Promise<any> | void;
  isPaid?: boolean;
  priceCents?: number;
  currency?: string;
  paymentGateway?: string;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatPrice = (cents: number, cur: string) => {
    const amount = (cents / 100).toFixed(2);
    const symbols: Record<string, string> = { usd: '$', inr: '₹', eur: '€', gbp: '£' };
    return `${symbols[cur] || cur.toUpperCase() + ' '}${amount}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (onRegister) {
        const res: any = await onRegister(email, name || undefined);
        if (res?.checkout_url) {
          window.location.href = res.checkout_url;
          return;
        }
        if (isPaid && !res?.verified) {
          throw new Error('Payment was not completed. Registration is pending payment.');
        }
      } else if (isPaid) {
        setError('This is a preview. To test payment, publish and visit the live page.');
        return;
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || 'Registration / payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white shadow-2xl md:sticky md:bottom-4 md:ml-auto md:w-80 md:rounded-2xl md:border md:shadow-xl md:float-right md:mr-6">
      <div className="p-4 md:p-5">
        {submitted ? (
          <div className="text-center p-3 bg-green-50 rounded-xl border border-green-200">
            <p className="text-green-700 font-semibold text-sm">
              {data.success_message || "✓ You're registered!"}
            </p>
            <p className="text-[11px] text-green-600 mt-0.5">Check email for details.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">{data.title || 'Register Now'}</p>
              {isPaid && priceCents && priceCents > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  {formatPrice(priceCents, currency || 'usd')}
                </span>
              )}
            </div>
            <input type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white text-black" />
            <input type="email" required placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white text-black" />
            {isPaid && priceCents && priceCents > 0 ? (
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-60">
                {loading ? 'Processing…' : `Register Now — ${formatPrice(priceCents, currency || 'usd')}`}
              </button>
            ) : (
              <button type="submit" disabled={loading} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60">
                {loading ? '…' : data.cta_text || 'Register'}
              </button>
            )}
            {error && <p className="text-xs text-rose-500">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

// ── Contact Section ───────────────────────────────────────────────────────

export function ContactSection({ data }: { data: any }) {
  if (!data.email && !data.phone) return null;
  const bg = getBgStyle(data, 'bg-gray-900');
  return (
    <section className={`px-6 py-12 text-white text-center ${bg.className}`} style={bg.style}>
      <div className="mx-auto max-w-md">
        <h3 className="text-xl font-bold">{data.title}</h3>
        <div className="mt-4 space-y-2 text-sm text-gray-300">
          {data.email && <p>Email: {data.email}</p>}
          {data.phone && <p>Phone: {data.phone}</p>}
        </div>
      </div>
    </section>
  );
}
import { notFound } from 'next/navigation';
import PublicPageClient from './PublicPageClient';

/**
 * Public landing page route — renders a published landing page by slug.
 */
export const dynamic = 'force-dynamic';

function getApiUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || 'https://webinarflow-ai.onrender.com').replace(/\/$/, '');
  return raw.endsWith('/api/v1') ? raw : `${raw}/api/v1`;
}

async function getLandingPage(slug: string) {
  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/landing-pages/public/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function PublicLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lp = await getLandingPage(slug);

  if (!lp || !lp.is_published) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-[#45141b]/40 border border-[#a63344]/40 text-[#f8a5b2] shadow-lg">
            <span className="text-3xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-white">This Page is Currently in Draft</h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            This webinar / landing page is currently unpublished. The organizer has not yet made it publicly available.
          </p>
          <div className="pt-2">
            <a
              href="/dashboard"
              className="inline-block px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6b1e28] to-[#852533] text-white text-xs font-semibold hover:opacity-90 transition-opacity border border-[#a63344]/50 shadow-md"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  const content = {
    template: lp.template_id || lp.content?.template || 'modern-saas',
    sections: lp.content?.sections || (typeof lp.content === 'object' && !lp.content?.template ? lp.content : {}),
  };

  return (
    <div className="bg-white text-gray-900 min-h-screen">
      <PublicPageClient
        content={content}
        webinarId={lp.webinar_id}
        slug={slug}
        isPaid={lp.is_paid ?? false}
        priceCents={lp.price_cents ?? 0}
        currency={lp.currency ?? 'usd'}
        paymentGateway={lp.payment_gateway || 'stripe'}
      />
    </div>
  );
}
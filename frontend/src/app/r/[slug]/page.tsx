import { notFound } from 'next/navigation';

/**
 * Public landing page route — renders a published landing page by slug.
 */
export const dynamic = 'force-dynamic';

async function getLandingPage(slug: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const res = await fetch(`${apiUrl}/landing-pages/public/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default async function PublicLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lp = await getLandingPage(slug);
  if (!lp || !lp.is_published) notFound();

  const content = lp.content || {};

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

// Client component loaded via dynamic import
import PublicPageClient from './PublicPageClient';
'use client';

import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AIAgentHero } from '@/components/dashboard/AIAgentHero';
import { AnalyticsOverview } from '@/components/dashboard/AnalyticsOverview';
import { CustomersSection } from '@/components/dashboard/CustomersSection';
import { WebinarsSection } from '@/components/dashboard/WebinarsSection';
import { PaymentsSection, RecentActivitySection } from '@/components/dashboard/PaymentsActivitySections';

/**
 * Signed-in dashboard Overview — the "2nd landing page".
 * Exact vertical flow per the Phase 2 design:
 *   AI Agent Hero → Analytics → Customers → Webinars → Payments → Recent Activity
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome, {firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your workspace is ready. Build complete webinar funnels with the AI Agent below.
        </p>
      </div>

      {/* 1. AI Agent Hero — dominant, full-width */}
      <AIAgentHero />

      {/* 2. Analytics */}
      <AnalyticsOverview />

      {/* 3. Customers */}
      <CustomersSection />

      {/* 4. Webinars */}
      <WebinarsSection />

      {/* 5. Payments */}
      <PaymentsSection />

      {/* 6. Recent Activity */}
      <RecentActivitySection />

      {/* Email unverified reminder (kept from Phase 1) */}
      {user && !user.is_verified && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-50 p-4 text-sm text-amber-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Please verify your email address to unlock all features. Check your inbox for the
            verification link.
          </p>
        </div>
      )}
    </div>
  );
}

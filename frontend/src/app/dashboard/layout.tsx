import { RequireAuth } from '@/components/auth/RequireAuth';
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';

/**
 * Signed-in dashboard shell. Respects light/dark theme from next-themes.
 * Gated by RequireAuth — an unauthenticated visitor is redirected to /login.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-background text-foreground">
        {/* Sidebar: fixed on desktop, hidden on mobile (topbar toggles it) */}
        <div className="fixed inset-y-0 left-0 z-30 hidden w-60 md:block">
          <DashboardSidebar />
        </div>

        <div className="flex min-h-screen flex-col md:pl-60">
          <DashboardTopbar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}

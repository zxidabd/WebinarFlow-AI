'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

/**
 * Client-side route guard.
 * Safely checks authentication state and redirects to /login if unauthenticated.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasAuth, setHasAuth] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    // 1. Check if token already in store
    if (accessToken) {
      setHasAuth(true);
      setChecking(false);
      return;
    }

    // 2. Check localStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('webinarflow-auth');
        if (raw) {
          const parsed = JSON.parse(raw);
          const token = parsed?.state?.accessToken;
          if (token && typeof token === 'string' && token.trim().length > 10) {
            useAuthStore.setState({
              accessToken: token,
              user: parsed.state.user || null,
              organization: parsed.state.organization || null,
            });
            setHasAuth(true);
            setChecking(false);
            return;
          }
        }
      } catch {}
    }

    // 3. Unauthenticated -> redirect to /login
    setHasAuth(false);
    setChecking(false);
    router.replace('/login');
  }, [accessToken, router]);

  if (checking || !hasAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-[#f87171]" />
      </div>
    );
  }

  return <>{children}</>;
}
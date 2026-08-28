/**
 * Client-side route guard. Waits for zustand to rehydrate from localStorage,
 * then either renders children (authenticated) or redirects to /login.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    // Check if token exists in localStorage immediately
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('webinarflow-auth');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.state?.accessToken) {
            useAuthStore.setState({
              accessToken: parsed.state.accessToken,
              user: parsed.state.user || null,
              organization: parsed.state.organization || null,
            });
            setHydrated(true);
            return;
          }
        }
      } catch {}
    }

    // Rehydrate store
    useAuthStore.persist.rehydrate();
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    );
  }

  // Check token in state or direct in localStorage
  let hasValidToken = Boolean(accessToken);
  if (!hasValidToken && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('webinarflow-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.state?.accessToken) {
          hasValidToken = true;
        }
      }
    } catch {}
  }

  if (!hasValidToken) {
    router.replace('/login');
    return null;
  }

  return <>{children}</>;
}
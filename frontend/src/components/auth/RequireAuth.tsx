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

  // Once zustand has rehydrated from localStorage, mark as ready.
  // The state selector picks up the token as soon as it's available.
  useEffect(() => {
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

  // Redirect to login after hydration if no token was found.
  if (!accessToken) {
    router.replace('/login');
    return null;
  }

  return <>{children}</>;
}
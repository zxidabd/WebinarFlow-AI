'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/hooks/useAuth';
import { apiErrorMessage } from '@/lib/auth-api';

type Status = 'exchanging' | 'error';

function LinkedInCallbackInner() {
  const params = useSearchParams();
  const code = params.get('code') ?? '';
  const state = params.get('state') ?? '';
  const router = useRouter();
  const { loginWithLinkedIn } = useAuth();
  const [status, setStatus] = useState<Status>('exchanging');
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!code || !state) {
      setStatus('error');
      setMessage('This sign-in link is missing the required LinkedIn parameters.');
      return;
    }

    loginWithLinkedIn(code, state)
      .then(() => {
        router.replace('/dashboard');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(apiErrorMessage(error, 'LinkedIn sign-in failed. Please try again.'));
      });
  }, [code, state, loginWithLinkedIn, router]);

  if (status === 'exchanging') {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-white/60" />
        <p className="text-sm text-white/70">Finishing sign-in with LinkedIn…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <XCircle className="h-12 w-12 text-destructive" />
      <p className="text-sm text-white/80">{message}</p>
      <Button asChild className="w-full">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </div>
  );
}

export default function LinkedInCallbackPage() {
  return (
    <AuthShell title="LinkedIn sign-in">
      <Suspense fallback={<Loader2 className="mx-auto h-5 w-5 animate-spin text-white/60" />}>
        <LinkedInCallbackInner />
      </Suspense>
    </AuthShell>
  );
}

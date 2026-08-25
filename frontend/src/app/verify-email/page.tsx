'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle, MailCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
import { apiErrorMessage, resendVerification, verifyEmail } from '@/lib/auth-api';

type Status = 'verifying' | 'success' | 'expired' | 'invalid' | 'error';

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setStatus('invalid');
      setMessage('This verification link is missing its token.');
      return;
    }

    verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Email verified successfully. Your WebinarFlow account is now ready.');
      })
      .catch((error) => {
        const errorMsg = apiErrorMessage(error, 'This verification link is invalid or has expired.');
        if (errorMsg.toLowerCase().includes('expired')) {
          setStatus('expired');
          setMessage('This verification link has expired. Please request a fresh link.');
        } else if (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('invalid')) {
          setStatus('invalid');
          setMessage('This verification link is invalid or has already been used.');
        } else {
          setStatus('error');
          setMessage(errorMsg);
        }
      });
  }, [token]);

  const onResend = async () => {
    if (!resendEmail || resending) return;
    setResending(true);
    try {
      await resendVerification(resendEmail);
      setResent(true);
      toast.success('If an unverified account exists for that email, a fresh verification link has been sent.');
    } catch (error: any) {
      if (error?.response?.status === 429) {
        toast.error('Please wait 60 seconds before requesting another email.');
      } else {
        toast.error(apiErrorMessage(error, 'Could not resend the verification email.'));
      }
    } finally {
      setResending(false);
    }
  };

  if (status === 'verifying') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-white/60" />
        <p className="text-sm text-white/80 font-medium">Verifying your email address…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      {status === 'success' ? (
        <CheckCircle2 className="h-14 w-14 text-emerald-400" />
      ) : status === 'expired' ? (
        <AlertTriangle className="h-14 w-14 text-amber-400" />
      ) : (
        <XCircle className="h-14 w-14 text-rose-500" />
      )}

      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-white">
          {status === 'success'
            ? 'Account Verified'
            : status === 'expired'
            ? 'Link Expired'
            : 'Verification Failed'}
        </h2>
        <p className="text-sm text-white/70 max-w-sm">{message}</p>
      </div>

      {status === 'success' ? (
        <div className="w-full pt-4">
          <Button asChild className="w-full bg-[#4a6cf7] hover:bg-[#3b5ce5] text-white py-3">
            <Link href="/login">Log in to your account</Link>
          </Button>
        </div>
      ) : (
        <div className="w-full space-y-4 pt-4 border-t border-white/10">
          <p className="text-xs text-white/60 text-left">
            Enter your email address below to receive a new verification link:
          </p>
          <div className="space-y-2 text-left">
            <Label htmlFor="resend-email" className="text-xs text-white/80 font-medium">
              Email Address
            </Label>
            <Input
              id="resend-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              disabled={resending || resent}
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              className="bg-white text-black placeholder:text-gray-400"
            />
          </div>
          <Button
            type="button"
            className="w-full bg-white/10 hover:bg-white/15 text-white"
            disabled={resending || resent || !resendEmail}
            onClick={onResend}
          >
            {resending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : resent ? (
              <>
                <MailCheck className="h-4 w-4 mr-2 text-emerald-400" />
                Link Sent!
              </>
            ) : (
              'Resend verification email'
            )}
          </Button>
          <Button asChild variant="ghost" className="w-full text-white/60 hover:text-white">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthShell title="Email Verification" subtitle="Activate your WebinarFlow account">
      <Suspense fallback={<Loader2 className="mx-auto h-5 w-5 animate-spin text-white/60" />}>
        <VerifyEmailInner />
      </Suspense>
    </AuthShell>
  );
}

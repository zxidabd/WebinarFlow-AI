'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sessionId = searchParams.get('session_id');
  const registrantId = searchParams.get('registrant_id');

  useEffect(() => {
    async function verify() {
      if (sessionId && registrantId) {
        try {
          const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://webinarflow-ai.onrender.com/api/v1').replace(/\/$/, '');
          const res = await fetch(`${apiUrl}/payments/verify-session?session_id=${encodeURIComponent(sessionId)}&registrant_id=${encodeURIComponent(registrantId)}`);
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            // If webhook already processed it or session is valid, it's fine; otherwise handle error
            if (res.status === 400 && errData.detail?.includes('Payment has not been completed')) {
              setError(errData.detail);
            }
          }
        } catch (e: any) {
          console.warn('Backend verification call error:', e);
        }
      }
      setLoading(false);
    }
    verify();
  }, [sessionId, registrantId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <Card className={`w-full max-w-md ${error ? 'border-rose-200' : 'border-green-200'} shadow-lg`}>
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            {loading ? (
              <Loader2 className="h-16 w-16 text-emerald-600 animate-spin" />
            ) : error ? (
              <div className="h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto text-rose-600 font-bold text-2xl">
                ✕
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle className="h-10 w-10" />
              </div>
            )}
          </div>
          <CardTitle className={`text-2xl ${error ? 'text-rose-700' : 'text-emerald-700'}`}>
            {loading ? 'Confirming Ticket & Payment...' : error ? 'Payment Incomplete' : 'Ticket & Registration Confirmed!'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {loading ? (
            <p className="text-muted-foreground">
              Please wait while we verify your transaction with the payment gateway...
            </p>
          ) : error ? (
            <>
              <p className="text-muted-foreground text-sm">
                {error}. Your registration is still pending payment.
              </p>
              <div className="pt-4 space-y-2">
                <Button asChild className="w-full bg-rose-600 hover:bg-rose-700">
                  <Link href="/">Return to Home</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                Your payment was received successfully! Your registration is now officially confirmed and your access link has been generated.
              </p>
              {sessionId && (
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <p className="text-xs text-emerald-800 font-mono">
                    Transaction Ref: {sessionId.slice(0, 24)}...
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                A confirmation email with the webinar join link has been dispatched to your inbox.
              </p>
              <div className="pt-4 space-y-2">
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/">
                    Back to Home
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 text-green-600 animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}

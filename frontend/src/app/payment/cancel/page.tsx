'use client';

import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-red-200 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-rose-700">
            Ticket Purchase Incomplete
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground text-sm">
            Your payment was not completed or was cancelled. Your registration is currently <strong>not confirmed</strong> and no admission ticket has been issued.
          </p>
          <p className="text-xs text-muted-foreground">
            No charges were made to your account. You can return to the webinar page and retry your registration at any time.
          </p>
          <div className="pt-4 space-y-2">
            <Button asChild className="w-full bg-rose-600 hover:bg-rose-700">
              <button onClick={() => window.history.back()} className="flex items-center justify-center w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Return & Retry Registration
              </button>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { apiErrorMessage } from '@/lib/auth-api';
import { cn } from '@/lib/utils';

/**
 * Google sign-in button used on the login and register pages.
 *
 * Clicking it fetches the Google consent URL from the backend and redirects
 * the browser there; Google then returns to `/auth/google/callback`, which
 * completes the exchange. Kept as its own client component so the redirect
 * (and any "Google not configured" error) can be surfaced per-button.
 */
export function GoogleButton({ className }: { className?: string }) {
  const { beginGoogleSignIn } = useAuth();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    setLoading(true);
    try {
      await beginGoogleSignIn();
      // The browser navigates away here; if it returns to this page, the
      // backend likely 503'd because Google OAuth isn't configured.
      setLoading(false);
    } catch (error) {
      setLoading(false);
      toast.error(apiErrorMessage(error, 'Google sign-in is not configured on the server'));
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm", className)}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
          />
        </svg>
      )}
      Continue with Google
    </Button>
  );
}

/** The "or" divider placed between the Google button and the email form. */
export function AuthDivider() {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-slate-200" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-white px-2 text-slate-400 font-medium">or</span>
      </div>
    </div>
  );
}

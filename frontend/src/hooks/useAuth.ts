/**
 * `useAuth` — the single hook screens use for auth state + actions.
 *
 * Wraps the persisted zustand store and the auth API calls, keeping the store
 * and the `webinarflow-auth` localStorage slice (read by `api.ts`) in sync.
 */
'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import * as authApi from '@/lib/auth-api';
import type { LoginPayload, RegisterPayload } from '@/types/auth';

export function useAuth() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const setSession = useAuthStore((s) => s.setSession);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const res = await authApi.login(payload);
      setSession(res);
      return res;
    },
    [setSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const res = await authApi.register(payload);
      // Registration does not establish a session until email verification
      return res;
    },
    [],
  );

  /** Kick off Google sign-in: fetch the consent URL and redirect the browser. */
  const beginGoogleSignIn = useCallback(async () => {
    try {
      const { url } = await authApi.googleAuthUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (e: any) {
      toast.error(authApi.apiErrorMessage(e, 'Google OAuth is not configured on the server yet. Please add GOOGLE_OAUTH_CLIENT_ID in Render.'));
    }
  }, []);

  /** Complete Google sign-in after the OAuth callback, persisting the session. */
  const loginWithGoogle = useCallback(
    async (code: string, state: string) => {
      const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/auth/google/callback` : undefined;
      const res = await authApi.googleAuthExchange(code, state, redirectUri);
      setSession(res);
      return res;
    },
    [setSession],
  );

  /** Kick off LinkedIn sign-in: fetch the consent URL and redirect the browser. */
  const beginLinkedInSignIn = useCallback(async () => {
    try {
      const { url } = await authApi.linkedinAuthUrl();
      if (url) {
        window.location.href = url;
      }
    } catch (e: any) {
      toast.error(authApi.apiErrorMessage(e, 'LinkedIn OAuth is not configured on the server yet. Please add LINKEDIN_CLIENT_ID in Render.'));
    }
  }, []);

  /** Complete LinkedIn sign-in after the OAuth callback, persisting the session. */
  const loginWithLinkedIn = useCallback(
    async (code: string, state: string) => {
      const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/auth/linkedin/callback` : undefined;
      const res = await authApi.linkedinAuthExchange(code, state, redirectUri);
      setSession(res);
      return res;
    },
    [setSession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort server revoke; clear locally regardless.
    }
    clear();
    router.push('/login');
  }, [clear, router]);

  /** Re-fetch the current user (e.g. after email verification). */
  const refreshUser = useCallback(async () => {
    const me = await authApi.getMe();
    setUser(me);
    return me;
  }, [setUser]);

  return {
    accessToken,
    user,
    organization,
    isAuthenticated: Boolean(accessToken),
    login,
    register,
    loginWithGoogle,
    beginGoogleSignIn,
    loginWithLinkedIn,
    beginLinkedInSignIn,
    logout,
    refreshUser,
  };
}

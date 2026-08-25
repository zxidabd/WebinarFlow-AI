/**
 * Persisted auth store.
 *
 * Persists accessToken, user, and organization to localStorage under
 * `webinarflow-auth`. The API client (lib/api.ts) reads accessToken directly
 * from that same localStorage key to avoid an import cycle.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, OrganizationRole } from '@/types/auth';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  organization: OrganizationRole | null;

  setSession: (session: {
    accessToken: string;
    user: AuthUser;
    organization: OrganizationRole;
  }) => void;
  setAccessToken: (accessToken: string) => void;
  setUser: (user: AuthUser) => void;
  clear: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      organization: null,

      setSession: ({ accessToken, user, organization }) =>
        set({ accessToken, user, organization }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      clear: () => set({ accessToken: null, user: null, organization: null }),
      isAuthenticated: () => Boolean(get().accessToken),
    }),
    {
      name: 'webinarflow-auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        user: s.user,
        organization: s.organization,
      }),
    },
  ),
);

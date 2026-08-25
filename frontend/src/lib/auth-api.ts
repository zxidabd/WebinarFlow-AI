/**
 * Auth API calls — thin wrappers over the shared axios `api` client.
 *
 * The access token is returned in the JSON body; the refresh token is managed
 * by the backend as an httpOnly cookie (`wf_refresh`) and never touched here.
 */
import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import type {
  AuthResponse,
  LoginPayload,
  MeResponse,
  RegisterPayload,
  RegisterResponse,
} from '@/types/auth';

/** Pull a human-readable message out of a FastAPI error response. */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  if (typeof error === 'object' && error !== null) {
    const detail = (error as any)?.response?.data?.detail ?? (error as any)?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      const first = detail[0];
      if (typeof first === 'string') return first;
      if (typeof first === 'object' && first?.msg) {
        const loc = Array.isArray(first?.loc) ? first.loc[first.loc.length - 1] : '';
        return loc ? `${loc}: ${first.msg}` : first.msg;
      }
      return JSON.stringify(first);
    }
    if (typeof detail === 'object' && detail !== null && (detail as any).msg) {
      return (detail as any).msg;
    }
    if ((error as any).message && typeof (error as any).message === 'string') {
      return (error as any).message;
    }
  }

  return fallback;
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const { data } = await api.post<RegisterResponse>('/auth/register', payload);
  return data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout', {});
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>('/users/me');
  return data;
}

export async function resendVerification(email: string): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>('/auth/resend-verification', { email });
  return data;
}

export async function verifyEmail(token: string): Promise<{ detail: string; email: string }> {
  const { data } = await api.get<{ detail: string; email: string }>('/auth/verify-email', { params: { token } });
  return data;
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post('/auth/reset-password', { token, new_password: newPassword });
}

/** Fetch the Google consent URL (also sets a short-lived state cookie). */
export async function googleAuthUrl(): Promise<{ url: string; state: string }> {
  const { data } = await api.get<{ url: string; state: string }>('/auth/google');
  return data;
}

/**
 * Complete Google sign-in: post the OAuth `code` (and `state` for a redundant
 * CSRF check) back to the backend, which verifies the `wf_google_state` cookie
 * and exchanges the code with Google itself. Returns the same `AuthResponse`
 * as login (access token in the body, refresh token in the cookie).
 */
export async function googleAuthExchange(code: string, state: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/google', { code, state });
  return data;
}

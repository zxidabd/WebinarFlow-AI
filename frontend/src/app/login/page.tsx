'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff, Lock, Linkedin, AlertCircle, MailCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/hooks/useAuth';
import { apiErrorMessage, resendVerification } from '@/lib/auth-api';
import { loginSchema, type LoginValues } from '@/lib/validation/auth';

export default function LoginPage() {
  const router = useRouter();
  const { login, beginGoogleSignIn, beginLinkedInSignIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true); // Default to true for persistent sessions
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    // If user is already logged in, redirect directly to dashboard
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('webinarflow-auth');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.state?.accessToken) {
            router.replace('/dashboard');
            return;
          }
        }
        const remembered = localStorage.getItem('wf_remember_me');
        if (remembered !== null) {
          setRememberMe(remembered === 'true');
        }
      } catch {}
    }
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setSubmitting(true);
    setUnverifiedEmail(null);
    setResent(false);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('wf_remember_me', rememberMe ? 'true' : 'false');
      }
      await login(values);
      toast.success('Welcome back');
      router.push('/dashboard');
    } catch (error: any) {
      const status = error?.response?.status;
      const msg = apiErrorMessage(error, 'Could not sign in');
      if (status === 403 || msg.toLowerCase().includes('verify your email') || msg.toLowerCase().includes('not verified')) {
        setUnverifiedEmail(values.email);
        toast.error('Please verify your email before logging in.');
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!unverifiedEmail || resending) return;
    setResending(true);
    try {
      await resendVerification(unverifiedEmail);
      setResent(true);
      toast.success('A fresh verification link has been sent to your email.');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not resend the verification email.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Welcome To WebinarFlow"
      subtitle="Sign in by entering the information below"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#4a6cf7] hover:underline">
            Start free trial
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Unverified Email Warning Banner */}
        {unverifiedEmail && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-left space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-500">
                  Please verify your email before logging in.
                </p>
                <p className="text-xs text-amber-400/80 mt-1">
                  We sent a confirmation link to <strong className="text-white">{unverifiedEmail}</strong>.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={resending || resent}
              onClick={onResend}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 px-3.5 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
            >
              {resending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Sending...
                </>
              ) : resent ? (
                <>
                  <MailCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Link sent!
                </>
              ) : (
                'Resend verification email'
              )}
            </button>
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs text-gray-500 font-medium">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="mail@user.com"
            style={{ backgroundColor: '#ffffff', color: '#000000' }}
            className="border border-gray-200 bg-white rounded-lg px-4 py-3 w-full text-sm text-black font-medium placeholder:text-gray-400 placeholder:font-normal focus:border-[#4a6cf7] focus:ring-1 focus:ring-[#4a6cf7] outline-none transition-colors"
            {...register('email')}
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs text-gray-500 font-medium">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              style={{ backgroundColor: '#ffffff', color: '#000000' }}
              className="border border-gray-200 bg-white rounded-lg px-4 py-3 pr-12 w-full text-sm text-black font-medium placeholder:text-gray-400 placeholder:font-normal focus:border-[#4a6cf7] focus:ring-1 focus:ring-[#4a6cf7] outline-none transition-colors"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>

        {/* Remember Me + Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center space-x-2 cursor-pointer group">
            <div className="relative flex items-center justify-center w-4 h-4 border border-gray-300 rounded focus-within:ring-2 focus-within:ring-[#4a6cf7] focus-within:ring-offset-1 group-hover:border-[#4a6cf7] transition-colors">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="opacity-0 absolute w-full h-full cursor-pointer"
              />
              {rememberMe && (
                <svg className="w-3 h-3 text-[#4a6cf7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-600">Remember Me</span>
          </label>

          <Link href="/forgot-password" className="text-sm text-[#4a6cf7] hover:underline">
            Forgotten Password
          </Link>
        </div>

        {/* SIGN IN button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#4a6cf7] hover:bg-[#3b5ce5] text-white rounded-lg py-3 flex items-center justify-center space-x-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Lock className="w-5 h-5" />
          )}
          <span className="font-medium text-sm tracking-wide">SIGN IN</span>
        </button>

        {/* Social login buttons */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={() => beginGoogleSignIn && beginGoogleSignIn()}
            className="flex-1 flex items-center justify-center space-x-2 border border-gray-200 rounded-lg py-2.5 px-6 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">Login</span>
          </button>

          <button
            type="button"
            onClick={() => beginLinkedInSignIn && beginLinkedInSignIn()}
            className="flex-1 flex items-center justify-center space-x-2 border border-gray-200 rounded-lg py-2.5 px-6 hover:bg-gray-50 transition-colors"
          >
            <Linkedin className="w-5 h-5 text-[#0077b5]" />
            <span className="text-sm font-medium text-gray-700">Login</span>
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

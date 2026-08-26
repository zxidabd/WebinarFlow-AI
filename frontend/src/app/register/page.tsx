'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff, Lock, Linkedin } from 'lucide-react';
import { toast } from 'sonner';

import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/hooks/useAuth';
import { apiErrorMessage, resendVerification } from '@/lib/auth-api';
import { registerSchema, type RegisterValues } from '@/lib/validation/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, beginGoogleSignIn, beginLinkedInSignIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [phase, setPhase] = useState<'form' | 'check-email'>('form');
  const [pendingEmail, setPendingEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterValues) => {
    setSubmitting(true);
    try {
      await registerUser({
        email: values.email,
        password: values.password,
        full_name: values.full_name || undefined,
      });
      setPendingEmail(values.email);
      setPhase('check-email');
      toast.success('Account created — please check your email to verify it.');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not create your account'));
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!pendingEmail || resending) return;
    setResending(true);
    try {
      await resendVerification(pendingEmail);
      setResent(true);
      toast.success('A fresh verification link has been sent.');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not resend the verification email.'));
    } finally {
      setResending(false);
    }
  };

  if (phase === 'check-email') {
    return (
      <AuthShell
        title="Check your email"
        subtitle={`We sent a verification link to ${pendingEmail}. Click it to activate your account.`}
        footer={
          <>
            Already verified?{' '}
            <Link href="/login" className="text-[#4a6cf7] hover:underline font-medium">
              Sign in
            </Link>
          </>
        }
      >
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <p className="text-sm text-gray-600">
            {"Didn't get it? Check your spam folder, or resend the link below."}
          </p>
          <button
            type="button"
            className="w-full bg-[#4a6cf7] hover:bg-[#3b5ce5] text-white rounded-lg py-3 flex items-center justify-center transition-colors text-sm font-medium"
            disabled={resending || resent}
            onClick={onResend}
          >
            {resending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : resent ? (
              'Link sent'
            ) : (
              'Resend verification email'
            )}
          </button>
          <Link
            href="/login"
            className="w-full py-3 text-sm text-gray-500 font-medium hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center"
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create Your Account"
      subtitle="Sign up by entering the information below"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-[#4a6cf7] hover:underline font-medium">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Full Name Field */}
        <div className="space-y-1.5">
          <label htmlFor="full_name" className="text-xs text-gray-500 font-medium">
            Full Name
          </label>
          <input
            id="full_name"
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            style={{ backgroundColor: '#ffffff', color: '#000000' }}
            className="border border-gray-200 bg-white rounded-lg px-4 py-3 w-full text-sm text-black font-medium placeholder:text-gray-400 placeholder:font-normal focus:border-[#4a6cf7] focus:ring-1 focus:ring-[#4a6cf7] outline-none transition-colors"
            {...register('full_name')}
          />
          {errors.full_name && (
            <p className="text-xs text-red-500 mt-1">{errors.full_name.message}</p>
          )}
        </div>

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
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
          )}
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
              autoComplete="new-password"
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
          {errors.password && (
            <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* CREATE ACCOUNT button */}
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
          <span className="font-medium text-sm tracking-wide">CREATE ACCOUNT</span>
        </button>

        {/* Social signup buttons */}
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
            <span className="text-sm font-medium text-gray-700">Register</span>
          </button>

          <button
            type="button"
            onClick={() => beginLinkedInSignIn && beginLinkedInSignIn()}
            className="flex-1 flex items-center justify-center space-x-2 border border-gray-200 rounded-lg py-2.5 px-6 hover:bg-gray-50 transition-colors"
          >
            <Linkedin className="w-5 h-5 text-[#0077b5]" />
            <span className="text-sm font-medium text-gray-700">Register</span>
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

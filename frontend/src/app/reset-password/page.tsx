'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { AuthShell } from '@/components/auth/AuthShell';
import { apiErrorMessage, resetPassword } from '@/lib/auth-api';
import { resetPasswordSchema, type ResetPasswordValues } from '@/lib/validation/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (values: ResetPasswordValues) => {
    setSubmitting(true);
    try {
      await resetPassword(token, values.password);
      toast.success('Password updated — you can sign in now');
      router.push('/login');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not reset your password'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center py-4 space-y-3">
        <p className="text-sm text-gray-600">
          This reset link is invalid or has expired.
        </p>
        <Link href="/forgot-password" className="text-sm font-medium text-[#4a6cf7] hover:underline block">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-xs text-gray-500 font-medium">
          New Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="At least 8 characters"
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

      <div className="space-y-1.5">
        <label htmlFor="confirm" className="text-xs text-gray-500 font-medium">
          Confirm Password
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          style={{ backgroundColor: '#ffffff', color: '#000000' }}
          className="border border-gray-200 bg-white rounded-lg px-4 py-3 w-full text-sm text-black font-medium placeholder:text-gray-400 placeholder:font-normal focus:border-[#4a6cf7] focus:ring-1 focus:ring-[#4a6cf7] outline-none transition-colors"
          {...register('confirm')}
        />
        {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>}
      </div>

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
        <span className="font-medium text-sm tracking-wide">UPDATE PASSWORD</span>
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a New Password"
      subtitle="Enter your new password below"
      footer={
        <Link href="/login" className="text-[#4a6cf7] hover:underline font-medium">
          Back to sign in
        </Link>
      }
    >
      <Suspense fallback={<Loader2 className="mx-auto h-6 w-6 animate-spin text-[#4a6cf7]" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, MailCheck, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { AuthShell } from '@/components/auth/AuthShell';
import { apiErrorMessage, forgotPassword } from '@/lib/auth-api';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/validation/auth';

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setSubmitting(true);
    try {
      await forgotPassword(values.email);
      setSent(true);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not send the reset link'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Reset Your Password"
      subtitle={sent ? undefined : "Enter your email and we'll send you a reset link."}
      footer={
        <Link href="/login" className="text-[#4a6cf7] hover:underline font-medium">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <MailCheck className="h-12 w-12 text-[#4a6cf7]" />
          <p className="text-sm text-gray-700 font-medium">
            If an account exists for that email, a password reset link is on its way.
          </p>
          <Link
            href="/login"
            className="w-full bg-[#4a6cf7] hover:bg-[#3b5ce5] text-white rounded-lg py-3 flex items-center justify-center transition-colors text-sm font-medium mt-2"
          >
            Return to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
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
            <span className="font-medium text-sm tracking-wide">SEND RESET LINK</span>
          </button>
        </form>
      )}
    </AuthShell>
  );
}

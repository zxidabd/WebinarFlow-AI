"use client";

import React, { useState } from "react";
import RazorpayCheckoutButton from "@/components/RazorpayCheckoutButton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldCheck, CreditCard, CheckCircle2, AlertCircle, Info, Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function CheckoutDemoPage() {
  const [amountInRupees, setAmountInRupees] = useState<number>(500);
  const [customerName, setCustomerName] = useState<string>("Alex Johnson");
  const [customerEmail, setCustomerEmail] = useState<string>("alex.johnson@example.com");
  const [customerPhone, setCustomerPhone] = useState<string>("9876543210");
  const [customReceipt, setCustomReceipt] = useState<string>(`rcpt_${Date.now().toString().slice(-6)}`);

  const [paymentResult, setPaymentResult] = useState<{
    orderId: string;
    paymentId: string;
    signature: string;
    verifiedData: any;
  } | null>(null);

  const [paymentError, setPaymentError] = useState<string | null>(null);

  const amountInPaise = Math.max(100, Math.round(amountInRupees * 100));

  const handleSuccess = (res: {
    orderId: string;
    paymentId: string;
    signature: string;
    verifiedData: any;
  }) => {
    setPaymentResult(res);
    setPaymentError(null);
  };

  const handleError = (err: any) => {
    setPaymentError(err?.message || "Payment failed or was canceled.");
  };

  const resetForm = () => {
    setPaymentResult(null);
    setPaymentError(null);
    setCustomReceipt(`rcpt_${Date.now().toString().slice(-6)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Standard Web Checkout Integration</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Razorpay Payment Checkout
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Seamlessly test order generation, modal checkout, and server-side HMAC-SHA256 signature verification.
          </p>
        </div>

        {/* Payment Form & Details Card */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Main Controls */}
          <Card className="md:col-span-3 border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Order Configuration
              </CardTitle>
              <CardDescription>
                Configure the order details to initiate a Razorpay Standard Web Checkout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Preset Amounts */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Select Amount
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 10, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmountInRupees(preset)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        amountInRupees === preset
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-500 font-semibold"
                          : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      ₹{preset}
                      {preset === 1 && <span className="block text-[10px] text-slate-400 font-normal">100 paise min</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Amount (in INR)
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={amountInRupees}
                    onChange={(e) => setAmountInRupees(Math.max(1, Number(e.target.value) || 1))}
                    className="block w-full pl-8 pr-16 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-xs text-slate-400">{amountInPaise} paise</span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Full Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Phone Contact</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Checkout Action */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <RazorpayCheckoutButton
                  amount={amountInPaise}
                  currency="INR"
                  receipt={customReceipt}
                  name="WebinarFlow AI"
                  description={`Payment for Plan/Webinar (${customReceipt})`}
                  buttonText={`Pay ₹${amountInRupees.toLocaleString()} with Razorpay`}
                  prefill={{
                    name: customerName,
                    email: customerEmail,
                    contact: customerPhone,
                  }}
                  className="w-full text-base py-3.5 shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700"
                  onSuccess={handleSuccess}
                  onError={handleError}
                />

                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Verified HMAC-SHA256 Server Signature</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Side Info / Test Card Guide */}
          <div className="md:col-span-2 space-y-6">
            {/* Test Credentials Card */}
            <Card className="border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Razorpay Test Mode Info
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-amber-800 dark:text-amber-400/90 space-y-2">
                <p>Use any of the following details in the checkout modal:</p>
                <div className="bg-white/80 dark:bg-slate-900/80 p-2.5 rounded border border-amber-200 dark:border-amber-800/60 font-mono space-y-1 text-[11px]">
                  <div><span className="text-slate-500">Card:</span> 4111 4111 4111 4111</div>
                  <div><span className="text-slate-500">Expiry:</span> Any future (e.g. 12/28)</div>
                  <div><span className="text-slate-500">CVV:</span> 123</div>
                  <div><span className="text-slate-500">OTP:</span> Any 4-6 digit code</div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  UPI, Netbanking, or Wallet test simulators also work instantly.
                </p>
              </CardContent>
            </Card>

            {/* Architecture Card */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900 dark:text-white">
                  Workflow Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">1</span>
                  <span>Frontend creates order: <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">POST /api/create-order</code></span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">2</span>
                  <span>Backend generates Order ID via Razorpay SDK</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">3</span>
                  <span>Standard Checkout Modal opens</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">4</span>
                  <span>HMAC-SHA256 signature verified: <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">POST /api/verify-payment</code></span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Payment Verification Results */}
        {paymentResult && (
          <Card className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <CardTitle className="text-lg text-emerald-900 dark:text-emerald-300">
                      Payment Verified Successfully!
                    </CardTitle>
                    <CardDescription className="text-xs text-emerald-700 dark:text-emerald-400">
                      HMAC-SHA256 signature was verified by the backend server.
                    </CardDescription>
                  </div>
                </div>
                <button
                  onClick={resetForm}
                  className="text-xs flex items-center gap-1 text-emerald-800 hover:text-emerald-950 dark:text-emerald-400 dark:hover:text-emerald-200 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Test Another</span>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono bg-white dark:bg-slate-900 p-4 rounded-lg border border-emerald-200 dark:border-emerald-900/60">
                <div>
                  <span className="text-slate-500 font-sans font-semibold block">Payment ID</span>
                  <span className="text-slate-800 dark:text-slate-200 break-all">{paymentResult.paymentId}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-sans font-semibold block">Order ID</span>
                  <span className="text-slate-800 dark:text-slate-200 break-all">{paymentResult.orderId}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 font-sans font-semibold block">Cryptographic Signature</span>
                  <span className="text-slate-800 dark:text-slate-200 break-all text-[11px]">{paymentResult.signature}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Error Card */}
        {paymentError && (
          <Card className="border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <CardTitle className="text-base text-rose-900 dark:text-rose-300">
                  Payment Failed
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-rose-700 dark:text-rose-400">
              {paymentError}
            </CardContent>
          </Card>
        )}

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 underline underline-offset-4"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

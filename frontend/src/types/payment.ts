/** Payment types — match backend Pydantic schemas. */

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentProvider = 'stripe' | 'razorpay';

export interface PaymentRecord {
  id: string;
  registrant_id: string;
  webinar_id: string;
  organization_id: string;
  amount: string;
  currency: string;
  provider: PaymentProvider;
  provider_txn_id: string | null;
  checkout_session_id: string | null;
  status: PaymentStatus;
  failure_code: string | null;
  failure_message: string | null;
  refunded_at: string | null;
  refund_amount: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckoutSessionRequest {
  registrant_id: string;
  success_url?: string;
  cancel_url?: string;
}

export interface CheckoutSessionResponse {
  url: string;
  session_id: string;
}

export interface RazorpayOrderRequest {
  registrant_id: string;
  success_url?: string;
  cancel_url?: string;
}

export interface RazorpayOrderResponse {
  order_id: string;
  amount: number;  // in paise
  currency: string;
  key_id: string;
}

export interface PaymentStats {
  total_revenue: string;
  total_payments: number;
  completed_payments: number;
  pending_payments: number;
  failed_payments: number;
  refunded_amount: string;
  currency: string;
}

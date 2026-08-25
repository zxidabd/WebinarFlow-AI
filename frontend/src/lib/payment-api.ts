/** Payment API client — checkout sessions, orders, and payment history. */
import { api } from '@/lib/api';

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

export interface PaymentRecord {
  id: string;
  registrant_id: string;
  webinar_id: string;
  organization_id: string;
  amount: string;
  currency: string;
  provider: string;
  provider_txn_id: string | null;
  checkout_session_id: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  failure_code: string | null;
  failure_message: string | null;
  refunded_at: string | null;
  refund_amount: string | null;
  created_at: string;
  updated_at: string;
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

/** Create a Stripe checkout session for a registrant. */
export async function createCheckoutSession(
  payload: CheckoutSessionRequest
): Promise<CheckoutSessionResponse> {
  const { data } = await api.post<CheckoutSessionResponse>('/payments/checkout', payload);
  return data;
}

/** Create a Razorpay order for a registrant. */
export async function createRazorpayOrder(
  payload: RazorpayOrderRequest
): Promise<RazorpayOrderResponse> {
  const { data } = await api.post<RazorpayOrderResponse>('/payments/razorpay/order', payload);
  return data;
}

/** List payments for the current organization. */
export async function listPayments(webinarId?: string): Promise<PaymentRecord[]> {
  const params = webinarId ? { webinar_id: webinarId } : {};
  const { data } = await api.get<PaymentRecord[]>('/payments', { params });
  return data;
}

/** Get payment statistics for the current organization. */
export async function getPaymentStats(): Promise<PaymentStats> {
  const { data } = await api.get<PaymentStats>('/payments/stats');
  return data;
}

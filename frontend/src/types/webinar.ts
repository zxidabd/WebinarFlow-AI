/** Webinar & Landing Page types — match backend Pydantic schemas (camelCase wire format). */

export type WebinarStatus = 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled';
export type MeetingProvider = 'none' | 'zoom' | 'google_meet';
export type LandingPageStatus = 'draft' | 'published' | 'archived';
export type LandingPageType = 'opt_in' | 'thank_you' | 'sales' | 'replay' | 'custom';

export interface Webinar {
  id: string;
  organization_id: string;
  created_by: string;
  title: string;
  slug: string;
  description: string | null;
  status: WebinarStatus;
  provider: MeetingProvider;
  provider_meeting_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  capacity: number | null;
  location_type: string;
  agenda: Record<string, unknown> | null;
  ai_topic: string | null;
  is_published: boolean;
  registration_count: number;
  attendance_count: number;
  visitor_count: number;
  is_paid: boolean;
  price_cents: number;
  currency: string;
  payment_gateway: string;
  created_at: string;
  updated_at: string;
}

export interface WebinarCreatePayload {
  title: string;
  description?: string | null;
  status?: WebinarStatus;
  provider?: MeetingProvider;
  provider_meeting_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  timezone?: string;
  capacity?: number | null;
  location_type?: string;
  agenda?: Record<string, unknown> | null;
  ai_topic?: string | null;
  is_published?: boolean;
  is_paid?: boolean;
  price_cents?: number;
  currency?: string;
  payment_gateway?: string;
}

export interface WebinarUpdatePayload {
  title?: string;
  description?: string | null;
  status?: WebinarStatus;
  provider?: MeetingProvider;
  provider_meeting_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  timezone?: string;
  capacity?: number | null;
  location_type?: string;
  agenda?: Record<string, unknown> | null;
  ai_topic?: string | null;
  is_published?: boolean;
  is_paid?: boolean;
  price_cents?: number;
  currency?: string;
  payment_gateway?: string;
}

export interface PaginatedWebinars {
  items: Webinar[];
  total: number;
  limit: number;
  offset: number;
}

export interface WebinarDuplicateResponse {
  original_id: string;
  duplicate_id: string;
  duplicate_slug: string;
}

// --- Landing Page types ---

export interface LandingPage {
  id: string;
  webinar_id: string;
  organization_id: string;
  created_by: string;
  title: string;
  slug: string;
  status: LandingPageStatus;
  page_type: LandingPageType;
  content: Record<string, any> | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_image: string | null;
  custom_head_html: string | null;
  custom_body_html: string | null;
  published_at: string | null;
  is_published: boolean;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LandingPageCreatePayload {
  webinar_id: string;
  title: string;
  slug?: string;
  page_type?: LandingPageType;
  content?: Record<string, unknown> | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_image?: string | null;
  custom_head_html?: string | null;
  custom_body_html?: string | null;
  is_published?: boolean;
  template_id?: string | null;
}

export interface LandingPageUpdatePayload {
  title?: string;
  slug?: string;
  page_type?: LandingPageType;
  content?: Record<string, unknown> | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_image?: string | null;
  custom_head_html?: string | null;
  custom_body_html?: string | null;
  is_published?: boolean;
  template_id?: string | null;
}

export interface LandingPageItem {
  id: string;
  webinar_id: string;
  title: string;
  slug: string;
  status: LandingPageStatus;
  page_type: LandingPageType;
  is_published: boolean;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LandingPageDetail extends LandingPageItem {
  webinar_id: string;
  organization_id: string;
  created_by: string;
  content: Record<string, any> | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_image: string | null;
  custom_head_html: string | null;
  custom_body_html: string | null;
  published_at: string | null;
}

export interface PaginatedLandingPages {
  items: LandingPageItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface LandingPageDuplicateResponse {
  original_id: string;
  duplicate_id: string;
  duplicate_slug: string;
}

export interface LandingPageStats {
  id: string;
  title: string;
  slug: string;
  page_type: LandingPageType;
  is_published: boolean;
  visit_count: number;
  registration_count: number;
  conversion_rate: number;
}
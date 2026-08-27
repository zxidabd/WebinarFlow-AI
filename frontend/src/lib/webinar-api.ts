import { api } from '@/lib/api';
import type {
  Webinar,
  WebinarCreatePayload,
  WebinarUpdatePayload,
  PaginatedWebinars,
  WebinarDuplicateResponse,
  LandingPage,
  LandingPageCreatePayload,
  LandingPageUpdatePayload,
  PaginatedLandingPages,
  LandingPageDuplicateResponse,
} from '@/types/webinar';

const WEBINAR_PREFIX = '/webinars';
const LANDING_PAGE_PREFIX = '/landing-pages';
const REGISTRANT_PREFIX = '/registrations';

// --- Webinars ---

export async function listWebinars(params?: {
  status?: string;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<PaginatedWebinars> {
  const { data } = await api.get<PaginatedWebinars>(WEBINAR_PREFIX, { params });
  return data;
}

export async function getWebinar(id: string): Promise<Webinar> {
  const { data } = await api.get<Webinar>(`${WEBINAR_PREFIX}/${id}`);
  return data;
}

export async function createWebinar(payload: WebinarCreatePayload): Promise<Webinar> {
  const { data } = await api.post<Webinar>(WEBINAR_PREFIX, payload);
  return data;
}

export async function updateWebinar(id: string, payload: WebinarUpdatePayload): Promise<Webinar> {
  const { data } = await api.patch<Webinar>(`${WEBINAR_PREFIX}/${id}`, payload);
  return data;
}

export async function deleteWebinar(id: string): Promise<void> {
  await api.delete(`${WEBINAR_PREFIX}/${id}`);
}

export async function duplicateWebinar(id: string): Promise<WebinarDuplicateResponse> {
  const { data } = await api.post<WebinarDuplicateResponse>(`${WEBINAR_PREFIX}/${id}/duplicate`);
  return data;
}

// --- Landing Pages ---

export async function listLandingPages(params: {
  webinar_id: string;
  offset?: number;
  limit?: number;
  status?: string;
  page_type?: string;
  search?: string;
}): Promise<PaginatedLandingPages> {
  const { data } = await api.get<PaginatedLandingPages>(LANDING_PAGE_PREFIX, { params });
  return data;
}

export async function getLandingPage(id: string): Promise<LandingPage> {
  const { data } = await api.get<LandingPage>(`${LANDING_PAGE_PREFIX}/${id}`);
  return data;
}

export async function createLandingPage(payload: LandingPageCreatePayload): Promise<LandingPage> {
  const { data } = await api.post<LandingPage>(LANDING_PAGE_PREFIX, payload);
  return data;
}

export async function updateLandingPage(id: string, payload: LandingPageUpdatePayload): Promise<LandingPage> {
  const { data } = await api.patch<LandingPage>(`${LANDING_PAGE_PREFIX}/${id}`, payload);
  return data;
}

export async function deleteLandingPage(id: string): Promise<void> {
  await api.delete(`${LANDING_PAGE_PREFIX}/${id}`);
}

export async function duplicateLandingPage(id: string): Promise<LandingPageDuplicateResponse> {
  const { data } = await api.post<LandingPageDuplicateResponse>(`${LANDING_PAGE_PREFIX}/${id}/duplicate`);
  return data;
}

// --- Public Registration ---

export interface RegistrantItem {
  id: string;
  webinar_id: string;
  landing_page_id: string | null;
  email: string;
  full_name: string | null;
  status: string;
  registered_at: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegistrantListResponse {
  items: RegistrantItem[];
  total: number;
  limit: number;
  offset: number;
}

export async function listLandingPageRegistrations(
  landingPageId: string,
  params?: { search?: string; order?: 'asc' | 'desc'; limit?: number }
): Promise<RegistrantListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.set('search', params.search);
  searchParams.set('order', params?.order || 'desc');
  searchParams.set('limit', String(params?.limit || 200));
  const { data } = await api.get<RegistrantListResponse>(
    `${LANDING_PAGE_PREFIX}/${landingPageId}/registrations?${searchParams}`
  );
  return data;
}

export interface PublicRegisterResponse {
  registrant_id: string;
  webinar_id: string;
  landing_page_id?: string;
  email: string;
  full_name?: string;
  message?: string;
}

export async function publicRegister(
  webinarId: string,
  email: string,
  fullName?: string,
  utmParams?: Record<string, string>,
  landingPageId?: string
): Promise<PublicRegisterResponse> {
  const headers: Record<string, string> = {
    'X-Registrant-Email': email,
  };
  if (fullName) headers['X-Registrant-Name'] = fullName;
  if (landingPageId) headers['X-Landing-Page-Id'] = landingPageId;

  const { data } = await api.post<PublicRegisterResponse>(
    `/registrations/${webinarId}/register`,
    {},
    { headers, params: utmParams }
  );
  return data;
}

// --- Landing Page Stats ---

export interface LandingPageStats {
  id: string;
  title: string;
  slug: string;
  page_type: string;
  is_published: boolean;
  visit_count: number;
  registration_count: number;
  conversion_rate: number;
}

export async function getLandingPageStats(id: string): Promise<LandingPageStats> {
  const { data } = await api.get<LandingPageStats>(`${LANDING_PAGE_PREFIX}/${id}/stats`);
  return data;
}

export async function deleteRegistrant(id: string): Promise<void> {
  await api.delete(`${REGISTRANT_PREFIX}/${id}`);
}

export interface RegistrationsResponse {
  items: Array<{
    id: string;
    name: string;
    email: string;
    webinarTitle: string;
    status: 'Registered' | 'Attended' | 'Purchased';
    totalSpent: number;
    dateJoined: string;
  }>;
  total: number;
  totalLeads: number;
  activeBuyers: number;
  totalRevenue: number;
  avgLtv: number;
}

export function listRegistrations(
  landingPageId: string,
  params?: { search?: string; order?: 'asc' | 'desc'; limit?: number }
): Promise<RegistrantListResponse>;
export function listRegistrations(
  params?: { search?: string; status?: string; limit?: number; offset?: number }
): Promise<RegistrationsResponse>;
export async function listRegistrations(
  landingPageIdOrParams?: string | { search?: string; status?: string; limit?: number; offset?: number },
  params?: { search?: string; order?: 'asc' | 'desc'; limit?: number }
): Promise<any> {
  if (typeof landingPageIdOrParams === 'string') {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    searchParams.set('order', params?.order || 'desc');
    searchParams.set('limit', String(params?.limit || 200));
    const { data } = await api.get<RegistrantListResponse>(
      `${LANDING_PAGE_PREFIX}/${landingPageIdOrParams}/registrations?${searchParams}`
    );
    return data;
  }
  const { data } = await api.get<RegistrationsResponse>('/registrations', { params: landingPageIdOrParams });
  return data;
}

export interface AnalyticsOverviewResponse {
  total_views: number;
  total_registrations: number;
  attendance_rate: number;
  total_revenue: number;
  funnel_steps: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  top_webinars: Array<{
    id: string;
    title: string;
    date: string;
    registrants: number;
    conversion: string;
    revenue: string;
  }>;
}

export async function getAnalyticsOverview(range?: string): Promise<AnalyticsOverviewResponse> {
  const { data } = await api.get<AnalyticsOverviewResponse>('/analytics/overview', { params: { range } });
  return data;
}

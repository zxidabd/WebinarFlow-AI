/**
 * Auth domain types — mirror the backend schemas in
 * `app/schemas/token.py` and `app/schemas/user.py` (camelCase on the wire).
 */

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  email_verified?: boolean;
  is_super_user: boolean;
  last_login_at: string | null;
}

export interface OrganizationRole {
  id: string;
  name: string;
  slug: string;
  is_personal: boolean;
  role: string;
}

/** An organization from `/users/me` — includes `is_default`. */
export interface UserOrganization extends OrganizationRole {
  is_default: boolean;
}

/** Response of login / google — access token + identity + active org. */
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
  organization: OrganizationRole;
}

/** Response of `/auth/register` — no tokens returned. */
export interface RegisterResponse {
  message: string;
  email: string;
  email_verified: boolean;
}

/** Response of `/auth/refresh` — refresh token stays in the httpOnly cookie. */
export interface AccessTokenResponse {
  accessToken: string;
}

/** Response of `/users/me` — the user plus all their organizations. */
export interface MeResponse extends AuthUser {
  organizations: UserOrganization[];
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

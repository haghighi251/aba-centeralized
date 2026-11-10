import axios from "axios";

/** Base URL for all API calls — configured via NEXT_PUBLIC_API_BASE_URL */
const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/**
 * Builds an Authorization header object for Bearer-token requests.
 * All company management endpoints require the user's access token.
 */
function auth(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

export interface CompanySubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  maxServices: number | null;
  maxEnvironments: number | null;
  maxMonitoredBranches: number | null;
  monthlyPrice: number;
  yearlyPrice: number;
}

/**
 * Shape of a company returned by GET /company/:id.
 * `_count.users` is included by the backend's findById query so the
 * dashboard can display the member count without a separate API call.
 */
export interface CompanyDetail {
  id: number;
  username: string;
  email: string;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  status: string;
  payAsYouGo: boolean;
  subscriptionPlan?: CompanySubscriptionPlan | null;
  createdAt: string;
  /** Prisma aggregate count — number of users in this company */
  _count?: { users: number };
}

/** Shape of the response from GET /company/:id/stats. */
export interface CompanyStats {
  teamsCount: number;
  environmentsCount: number;
  servicesCount: number;
}

/** Editable fields sent to PUT /company/:id */
export interface UpdateCompanyPayload {
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

/**
 * A user within the company as returned by GET /company/:id/users.
 * Password and reset-token fields are stripped by the backend before returning.
 */
export interface CompanyUser {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  status: string;
  createdAt: string;
  /** Teams this user is linked to, via the generic TeamMembership table. */
  teams: { id: number; name: string }[];
}

/** Fields accepted when creating a new user inside a company (POST /company/:id/users). */
export interface AddUserPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  /** Only BUSINESS_ADMIN or BUSINESS_MEMBER are allowed; owners must be set differently. */
  role: "BUSINESS_ADMIN" | "BUSINESS_MEMBER";
  /** Initial password — user can reset it via Forgot Password. */
  password: string;
  /** Teams to link the new user to. */
  teamIds?: number[];
}

/** Fields accepted when updating an existing company user (PUT /company/:id/users/:userId). */
export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  /** Role change is restricted by the caller's own role (see CompanyManagerGuard). */
  role?: "BUSINESS_ADMIN" | "BUSINESS_MEMBER";
  /** When provided, replaces the user's full set of team links. */
  teamIds?: number[];
}

// ── Company endpoints ─────────────────────────────────────────────────────

/**
 * Fetch the details of a single company by its ID.
 * Requires the caller to belong to that company (enforced by CompanyAccessGuard).
 * The response includes `_count.users` for the member count shown on the dashboard.
 */
export async function getCompanyDetails(id: string, token: string): Promise<CompanyDetail> {
  const { data } = await axios.get(`${BASE}/company/${id}`, auth(token));
  return data.data;
}

/**
 * Fetch the dashboard stats (team and environment counts) for a company.
 * Requires the caller to belong to that company (enforced by CompanyAccessGuard).
 */
export async function getCompanyStats(id: string, token: string): Promise<CompanyStats> {
  const { data } = await axios.get(`${BASE}/company/${id}/stats`, auth(token));
  return data.data;
}

/**
 * Update editable fields of a company (email, website, address, etc.).
 * The company username/slug cannot be changed here — contact platform admin.
 * Requires BUSINESS_OWNER or BUSINESS_ADMIN role (enforced by CompanyManagerGuard).
 */
export async function updateCompanyDetails(
  id: string,
  payload: UpdateCompanyPayload,
  token: string,
): Promise<CompanyDetail> {
  const { data } = await axios.put(`${BASE}/company/${id}`, payload, auth(token));
  return data.data;
}

// ── User-management endpoints ─────────────────────────────────────────────

/**
 * Retrieve all users belonging to a company.
 * Any authenticated member of the company can call this, including BUSINESS_MEMBER
 * (CompanyAccessGuard) — the response is read-only for non-managers on the frontend.
 * Passwords and reset tokens are stripped server-side before returning.
 */
export async function getCompanyUsers(id: string, token: string): Promise<CompanyUser[]> {
  const { data } = await axios.get(`${BASE}/company/${id}/users`, auth(token));
  return data.data;
}

/**
 * Create a new user inside the company.
 * - BUSINESS_OWNER can assign BUSINESS_ADMIN or BUSINESS_MEMBER.
 * - BUSINESS_ADMIN can only assign BUSINESS_MEMBER.
 * - Optional `teamIds` links the new user to one or more teams.
 * The new user can reset their password via the Forgot Password flow.
 */
export async function addCompanyUser(
  id: string,
  payload: AddUserPayload,
  token: string,
): Promise<CompanyUser> {
  const { data } = await axios.post(`${BASE}/company/${id}/users`, payload, auth(token));
  return data.data;
}

/**
 * Update a company user's name, role, and/or team links.
 * BUSINESS_ADMIN cannot promote/demote other admins or the owner.
 * When `teamIds` is provided it replaces the user's full set of team links.
 */
export async function updateCompanyUser(
  id: string,
  userId: number,
  payload: UpdateUserPayload,
  token: string,
): Promise<CompanyUser> {
  const { data } = await axios.put(
    `${BASE}/company/${id}/users/${userId}`,
    payload,
    auth(token),
  );
  return data.data;
}

/**
 * Remove a user from the company permanently.
 * - BUSINESS_OWNER can remove anyone except themselves.
 * - BUSINESS_ADMIN can only remove BUSINESS_MEMBER users.
 */
export async function removeCompanyUser(
  id: string,
  userId: number,
  token: string,
): Promise<void> {
  await axios.delete(`${BASE}/company/${id}/users/${userId}`, auth(token));
}

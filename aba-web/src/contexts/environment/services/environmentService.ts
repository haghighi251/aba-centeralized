import axios from "axios";

/** Base URL for all API calls — configured via NEXT_PUBLIC_API_BASE_URL */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export type EnvironmentType =
  | "DEVELOPMENT"
  | "TESTING"
  | "STAGING"
  | "PRODUCTION"
  | "PREVIEW"
  | "DISASTER"
  | "DEMO"
  | "SUPPORT"
  | "EXPERIMENTAL"
  | "CUSTOM";

export type EnvironmentStatus = "ACTIVE" | "ARCHIVED";

/** Shape of an environment returned by the `/company/:id/environments...` endpoints. */
export interface Environment {
  id: number;
  name: string;
  slug: string;
  type: EnvironmentType;
  isProduction: boolean;
  order: number;
  description?: string | null;
  status: EnvironmentStatus;
  companyId: number;
  teamId: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentFilter {
  search?: string;
  teamId?: number;
  type?: EnvironmentType;
  status?: EnvironmentStatus;
  sortBy?: "order" | "name" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface GetEnvironmentsResult {
  data: Environment[];
  total: number;
}

/**
 * Fields accepted when creating a new environment (POST /company/:id/environments).
 * `slug` is intentionally omitted — the backend derives it from `name`.
 * `teamId` is required — every environment belongs to exactly one team.
 */
export interface CreateEnvironmentPayload {
  teamId: number;
  name: string;
  type?: EnvironmentType;
  isProduction?: boolean;
  order?: number;
  description?: string | null;
}

/** Fields accepted when updating an environment (PUT /company/:id/environments/:envId). */
export interface UpdateEnvironmentPayload {
  teamId?: number;
  name?: string;
  type?: EnvironmentType;
  isProduction?: boolean;
  order?: number;
  description?: string | null;
  status?: EnvironmentStatus;
}

/**
 * Builds an Authorization header object for Bearer-token requests.
 * All environment endpoints require the user's access token.
 */
function auth(accessToken: string) {
  return { headers: { Authorization: `Bearer ${accessToken}` } };
}

/**
 * List the environments for a company, with optional search/filter/sort.
 * Any authenticated member of the company can call this (CompanyAccessGuard).
 */
export async function getEnvironments(
  companyId: string,
  filter: EnvironmentFilter,
  accessToken: string,
): Promise<GetEnvironmentsResult> {
  const params = new URLSearchParams();
  if (filter.search) params.set("search", filter.search);
  if (filter.teamId) params.set("teamId", String(filter.teamId));
  if (filter.type) params.set("type", filter.type);
  if (filter.status) params.set("status", filter.status);
  if (filter.sortBy) params.set("sortBy", filter.sortBy);
  if (filter.sortOrder) params.set("sortOrder", filter.sortOrder);

  const { data } = await axios.get(
    `${BASE_URL}/company/${companyId}/environments?${params.toString()}`,
    auth(accessToken),
  );
  return data.data;
}

/**
 * Get a single environment by id.
 * Any authenticated member of the company can call this (CompanyAccessGuard).
 */
export async function getEnvironmentById(
  companyId: string,
  environmentId: number,
  accessToken: string,
): Promise<Environment> {
  const { data } = await axios.get(
    `${BASE_URL}/company/${companyId}/environments/${environmentId}`,
    auth(accessToken),
  );
  return data.data;
}

/**
 * Create a new environment for the company.
 * Requires BUSINESS_OWNER or BUSINESS_ADMIN (CompanyManagerGuard) — a
 * BUSINESS_MEMBER caller receives a 403 from the API.
 */
export async function createEnvironment(
  companyId: string,
  payload: CreateEnvironmentPayload,
  accessToken: string,
): Promise<Environment> {
  const { data } = await axios.post(
    `${BASE_URL}/company/${companyId}/environments`,
    payload,
    auth(accessToken),
  );
  return data.data;
}

/**
 * Update an existing environment.
 * Requires BUSINESS_OWNER or BUSINESS_ADMIN (CompanyManagerGuard).
 */
export async function updateEnvironment(
  companyId: string,
  environmentId: number,
  payload: UpdateEnvironmentPayload,
  accessToken: string,
): Promise<Environment> {
  const { data } = await axios.put(
    `${BASE_URL}/company/${companyId}/environments/${environmentId}`,
    payload,
    auth(accessToken),
  );
  return data.data;
}

/**
 * Permanently delete an environment.
 * Requires BUSINESS_OWNER or BUSINESS_ADMIN (CompanyManagerGuard).
 */
export async function deleteEnvironment(
  companyId: string,
  environmentId: number,
  accessToken: string,
): Promise<void> {
  await axios.delete(
    `${BASE_URL}/company/${companyId}/environments/${environmentId}`,
    auth(accessToken),
  );
}

/**
 * Extracts the `{ error }` message from the shared `{ success, error, data }`
 * response envelope on a failed Axios request, falling back to a default
 * message (e.g. for network errors or unexpected response shapes).
 */
export function getEnvironmentErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: string } | undefined)?.error;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}

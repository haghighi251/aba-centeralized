import axios from "axios";

/** Base URL for all API calls — configured via NEXT_PUBLIC_API_BASE_URL */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export type ServiceType =
  | "BFF"
  | "API_GATEWAY"
  | "MICROSERVICE"
  | "WORKER"
  | "FRONTEND"
  | "DATABASE"
  | "CACHE"
  | "MESSAGE_QUEUE"
  | "OTHER";

export type ServiceStatus = "ACTIVE" | "ARCHIVED";

/** Rate-limit config, same shape as the worker's `ProxyRoute.rateLimit`. */
export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

/** Shape of a service returned by the `/company/:id/environments/:envId/services...` endpoints. */
export interface Service {
  id: number;
  name: string;
  slug: string;
  type: ServiceType;
  description?: string | null;
  baseUrl: string;
  rateLimitConfig?: RateLimitConfig | null;
  status: ServiceStatus;
  companyId: number;
  environmentId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceFilter {
  search?: string;
  type?: ServiceType;
  status?: ServiceStatus;
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface GetServicesResult {
  data: Service[];
  total: number;
}

/**
 * Fields accepted when registering a new service
 * (POST /company/:id/environments/:envId/services).
 * `slug` is intentionally omitted — the backend derives it from `name`.
 */
export interface CreateServicePayload {
  name: string;
  type?: ServiceType;
  description?: string | null;
  baseUrl: string;
  rateLimitConfig?: RateLimitConfig | null;
}

/** Fields accepted when updating a service (PUT /company/:id/environments/:envId/services/:serviceId). */
export interface UpdateServicePayload {
  name?: string;
  type?: ServiceType;
  description?: string | null;
  baseUrl?: string;
  rateLimitConfig?: RateLimitConfig | null;
  status?: ServiceStatus;
}

/**
 * Builds an Authorization header object for Bearer-token requests.
 * All service endpoints require the user's access token.
 */
function auth(accessToken: string) {
  return { headers: { Authorization: `Bearer ${accessToken}` } };
}

/**
 * List the services registered under an environment, with optional
 * search/filter/sort. Any authenticated member of the company can call
 * this (CompanyAccessGuard).
 */
export async function getServices(
  companyId: string,
  environmentId: number,
  filter: ServiceFilter,
  accessToken: string,
): Promise<GetServicesResult> {
  const params = new URLSearchParams();
  if (filter.search) params.set("search", filter.search);
  if (filter.type) params.set("type", filter.type);
  if (filter.status) params.set("status", filter.status);
  if (filter.sortBy) params.set("sortBy", filter.sortBy);
  if (filter.sortOrder) params.set("sortOrder", filter.sortOrder);

  const { data } = await axios.get(
    `${BASE_URL}/company/${companyId}/environments/${environmentId}/services?${params.toString()}`,
    auth(accessToken),
  );
  return data.data;
}

/**
 * Get a single service by id.
 * Any authenticated member of the company can call this (CompanyAccessGuard).
 */
export async function getServiceById(
  companyId: string,
  environmentId: number,
  serviceId: number,
  accessToken: string,
): Promise<Service> {
  const { data } = await axios.get(
    `${BASE_URL}/company/${companyId}/environments/${environmentId}/services/${serviceId}`,
    auth(accessToken),
  );
  return data.data;
}

/**
 * Register a new service under an environment.
 * Requires BUSINESS_OWNER or BUSINESS_ADMIN (CompanyManagerGuard) — a
 * BUSINESS_MEMBER caller receives a 403 from the API.
 */
export async function createService(
  companyId: string,
  environmentId: number,
  payload: CreateServicePayload,
  accessToken: string,
): Promise<Service> {
  const { data } = await axios.post(
    `${BASE_URL}/company/${companyId}/environments/${environmentId}/services`,
    payload,
    auth(accessToken),
  );
  return data.data;
}

/**
 * Update an existing service.
 * Requires BUSINESS_OWNER or BUSINESS_ADMIN (CompanyManagerGuard).
 */
export async function updateService(
  companyId: string,
  environmentId: number,
  serviceId: number,
  payload: UpdateServicePayload,
  accessToken: string,
): Promise<Service> {
  const { data } = await axios.put(
    `${BASE_URL}/company/${companyId}/environments/${environmentId}/services/${serviceId}`,
    payload,
    auth(accessToken),
  );
  return data.data;
}

/**
 * Permanently delete a service.
 * Requires BUSINESS_OWNER or BUSINESS_ADMIN (CompanyManagerGuard).
 */
export async function deleteService(
  companyId: string,
  environmentId: number,
  serviceId: number,
  accessToken: string,
): Promise<void> {
  await axios.delete(
    `${BASE_URL}/company/${companyId}/environments/${environmentId}/services/${serviceId}`,
    auth(accessToken),
  );
}

/**
 * Extracts the `{ error }` message from the shared `{ success, error, data }`
 * response envelope on a failed Axios request, falling back to a default
 * message (e.g. for network errors or unexpected response shapes).
 */
export function getServiceErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: string } | undefined)?.error;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}

import axios from "axios";

/** Base URL for all API calls — configured via NEXT_PUBLIC_API_BASE_URL */
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export type TeamStatus = "ACTIVE" | "ARCHIVED";

/** Shape of a team returned by the `/company/:id/teams...` endpoints. */
export interface Team {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  status: TeamStatus;
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamFilter {
  search?: string;
  status?: TeamStatus;
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface GetTeamsResult {
  data: Team[];
  total: number;
}

/**
 * Fields accepted when creating a new team (POST /company/:id/teams).
 * `slug` is intentionally omitted — the backend derives it from `name`.
 */
export interface CreateTeamPayload {
  name: string;
  description?: string | null;
}

/** Fields accepted when updating a team (PUT /company/:id/teams/:teamId). */
export interface UpdateTeamPayload {
  name?: string;
  description?: string | null;
  status?: TeamStatus;
}

/**
 * Builds an Authorization header object for Bearer-token requests.
 * All team endpoints require the user's access token.
 */
function auth(accessToken: string) {
  return { headers: { Authorization: `Bearer ${accessToken}` } };
}

/**
 * List the teams for a company, with optional search/filter/sort.
 * Any authenticated member of the company can call this (CompanyAccessGuard).
 */
export async function getTeams(
  companyId: string,
  filter: TeamFilter,
  accessToken: string,
): Promise<GetTeamsResult> {
  const params = new URLSearchParams();
  if (filter.search) params.set("search", filter.search);
  if (filter.status) params.set("status", filter.status);
  if (filter.sortBy) params.set("sortBy", filter.sortBy);
  if (filter.sortOrder) params.set("sortOrder", filter.sortOrder);

  const { data } = await axios.get(
    `${BASE_URL}/company/${companyId}/teams?${params.toString()}`,
    auth(accessToken),
  );
  return data.data;
}

/**
 * Create a new team for the company.
 * Requires BUSINESS_OWNER or BUSINESS_ADMIN (CompanyManagerGuard) — a
 * BUSINESS_MEMBER caller receives a 403 from the API.
 */
export async function createTeam(
  companyId: string,
  payload: CreateTeamPayload,
  accessToken: string,
): Promise<Team> {
  const { data } = await axios.post(
    `${BASE_URL}/company/${companyId}/teams`,
    payload,
    auth(accessToken),
  );
  return data.data;
}

/**
 * Update an existing team.
 * Requires BUSINESS_OWNER or BUSINESS_ADMIN (CompanyManagerGuard).
 */
export async function updateTeam(
  companyId: string,
  teamId: number,
  payload: UpdateTeamPayload,
  accessToken: string,
): Promise<Team> {
  const { data } = await axios.put(
    `${BASE_URL}/company/${companyId}/teams/${teamId}`,
    payload,
    auth(accessToken),
  );
  return data.data;
}

/**
 * Permanently delete a team (cascade-deletes its environments).
 * Requires BUSINESS_OWNER or BUSINESS_ADMIN (CompanyManagerGuard).
 */
export async function deleteTeam(
  companyId: string,
  teamId: number,
  accessToken: string,
): Promise<void> {
  await axios.delete(
    `${BASE_URL}/company/${companyId}/teams/${teamId}`,
    auth(accessToken),
  );
}

/**
 * Extracts the `{ error }` message from the shared `{ success, error, data }`
 * response envelope on a failed Axios request, falling back to a default
 * message (e.g. for network errors or unexpected response shapes).
 */
export function getTeamErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: string } | undefined)?.error;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}

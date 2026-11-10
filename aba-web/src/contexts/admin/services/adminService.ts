import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export interface CompanyKpis {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  pending: number;
}

export interface CompanyRow {
  id: number;
  username: string;
  email: string;
  status: string;
  website?: string | null;
  city?: string | null;
  country?: string | null;
  createdAt: string;
}

export interface GetCompaniesResult {
  data: CompanyRow[];
  total: number;
  kpis: CompanyKpis;
}

export interface CompanyFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export type CompanyStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";

export async function updateCompanyStatus(
  companyId: number,
  status: CompanyStatus,
  accessToken: string,
): Promise<CompanyRow> {
  const { data: envelope } = await axios.patch(
    `${BASE_URL}/admin/companies/${companyId}/status`,
    { status },
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  return envelope.data as CompanyRow;
}

export async function getCompanies(
  filter: CompanyFilter,
  accessToken: string,
): Promise<GetCompaniesResult> {
  const params = new URLSearchParams();
  if (filter.page)      params.set("page",      String(filter.page));
  if (filter.limit)     params.set("limit",     String(filter.limit));
  if (filter.search)    params.set("search",    filter.search);
  if (filter.status)    params.set("status",    filter.status);
  if (filter.sortBy)    params.set("sortBy",    filter.sortBy);
  if (filter.sortOrder) params.set("sortOrder", filter.sortOrder);

  const { data: envelope } = await axios.get(
    `${BASE_URL}/admin/companies?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  return envelope.data as GetCompaniesResult;
}

// ── Companies with vulnerabilities ─────────────────────────────────────────

export interface CompanyVulnerabilitySummaryRow extends CompanyRow {
  vulnerablePackageCount: number;
  affectedServiceCount: number;
  notificationCount: number;
  hasPrimaryOwner: boolean;
}

export interface GetCompaniesWithVulnerabilitiesResult {
  data: CompanyVulnerabilitySummaryRow[];
  total: number;
}

export async function getCompaniesWithVulnerabilities(
  filter: CompanyFilter,
  accessToken: string,
): Promise<GetCompaniesWithVulnerabilitiesResult> {
  const params = new URLSearchParams();
  if (filter.page)      params.set("page",      String(filter.page));
  if (filter.limit)     params.set("limit",     String(filter.limit));
  if (filter.search)    params.set("search",    filter.search);
  if (filter.status)    params.set("status",    filter.status);
  if (filter.sortBy)    params.set("sortBy",    filter.sortBy);
  if (filter.sortOrder) params.set("sortOrder", filter.sortOrder);

  const { data: envelope } = await axios.get(
    `${BASE_URL}/admin/companies/vulnerability-summary?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  return envelope.data as GetCompaniesWithVulnerabilitiesResult;
}

// ── Activity log browser ────────────────────────────────────────────────────

export type ActivityEventType =
  | "NOTIFICATION_SENT"
  | "NOTIFICATION_SKIPPED"
  | "PACKAGE_VULN_VIEWED"
  | "PACKAGE_UPDATED"
  | "PACKAGE_MUTED"
  | "PACKAGE_UNMUTED"
  | "PACKAGE_SNOOZED"
  | "PACKAGE_REMOVED";

export interface ActivityLogRow {
  id: number;
  eventType: ActivityEventType;
  actorUserId: number | null;
  companyId: number;
  environmentId: number | null;
  serviceId: number | null;
  servicePackageId: number | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

export interface ActivityLogFilter {
  page?: number;
  limit?: number;
  companyId?: number;
  environmentId?: number;
  serviceId?: number;
  eventType?: ActivityEventType;
  from?: string;
  to?: string;
}

export interface GetActivityLogsResult {
  data: ActivityLogRow[];
  total: number;
}

export async function getActivityLogs(
  filter: ActivityLogFilter,
  accessToken: string,
): Promise<GetActivityLogsResult> {
  const params = new URLSearchParams();
  if (filter.page)          params.set("page",          String(filter.page));
  if (filter.limit)         params.set("limit",         String(filter.limit));
  if (filter.companyId)     params.set("companyId",     String(filter.companyId));
  if (filter.environmentId) params.set("environmentId", String(filter.environmentId));
  if (filter.serviceId)     params.set("serviceId",     String(filter.serviceId));
  if (filter.eventType)     params.set("eventType",     filter.eventType);
  if (filter.from)          params.set("from",          filter.from);
  if (filter.to)            params.set("to",            filter.to);

  const { data: envelope } = await axios.get(
    `${BASE_URL}/admin/activity-logs?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  return envelope.data as GetActivityLogsResult;
}

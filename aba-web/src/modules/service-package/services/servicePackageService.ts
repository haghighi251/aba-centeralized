import axios from "axios";
import type {
  PackageFilter,
  PackageHistoryFilter,
  GetServicePackagesResult,
  ServicePackage,
  CreatePackagePayload,
  UpdatePackagePayload,
  BulkImportPayload,
  BulkImportResult,
  UpdateNotificationPreferencePayload,
} from "@/modules/service-package/types/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function auth(accessToken: string) {
  return { headers: { Authorization: `Bearer ${accessToken}` } };
}

function base(companyId: string, environmentId: number, serviceId: number): string {
  return `${BASE_URL}/company/${companyId}/environments/${environmentId}/services/${serviceId}/packages`;
}

export async function getServicePackages(
  companyId: string,
  environmentId: number,
  serviceId: number,
  filter: PackageFilter,
  accessToken: string,
): Promise<GetServicePackagesResult> {
  const params = new URLSearchParams();
  if (filter.search) params.set("search", filter.search);
  if (filter.ecosystem) params.set("ecosystem", filter.ecosystem);
  if (filter.sortBy) params.set("sortBy", filter.sortBy);
  if (filter.sortOrder) params.set("sortOrder", filter.sortOrder);

  const { data } = await axios.get(
    `${base(companyId, environmentId, serviceId)}?${params.toString()}`,
    auth(accessToken),
  );
  return data.data;
}

export async function getServicePackageHistory(
  companyId: string,
  environmentId: number,
  serviceId: number,
  filter: PackageHistoryFilter,
  accessToken: string,
): Promise<GetServicePackagesResult> {
  const params = new URLSearchParams();
  if (filter.search) params.set("search", filter.search);
  if (filter.status) params.set("status", filter.status);
  if (filter.sortBy) params.set("sortBy", filter.sortBy);
  if (filter.sortOrder) params.set("sortOrder", filter.sortOrder);

  const { data } = await axios.get(
    `${base(companyId, environmentId, serviceId)}/history?${params.toString()}`,
    auth(accessToken),
  );
  return data.data;
}

export async function createServicePackage(
  companyId: string,
  environmentId: number,
  serviceId: number,
  payload: CreatePackagePayload,
  accessToken: string,
): Promise<ServicePackage> {
  const { data } = await axios.post(
    base(companyId, environmentId, serviceId),
    payload,
    auth(accessToken),
  );
  return data.data;
}

export async function updateServicePackage(
  companyId: string,
  environmentId: number,
  serviceId: number,
  servicePackageId: number,
  payload: UpdatePackagePayload,
  accessToken: string,
): Promise<ServicePackage> {
  const { data } = await axios.put(
    `${base(companyId, environmentId, serviceId)}/${servicePackageId}`,
    payload,
    auth(accessToken),
  );
  return data.data;
}

export async function deleteServicePackage(
  companyId: string,
  environmentId: number,
  serviceId: number,
  servicePackageId: number,
  accessToken: string,
): Promise<ServicePackage> {
  const { data } = await axios.delete(
    `${base(companyId, environmentId, serviceId)}/${servicePackageId}`,
    auth(accessToken),
  );
  return data.data;
}

export async function bulkImportServicePackages(
  companyId: string,
  environmentId: number,
  serviceId: number,
  payload: BulkImportPayload,
  accessToken: string,
): Promise<BulkImportResult> {
  const { data } = await axios.post(
    `${base(companyId, environmentId, serviceId)}/bulk`,
    payload,
    auth(accessToken),
  );
  return data.data;
}

export async function updateServicePackageNotification(
  companyId: string,
  environmentId: number,
  serviceId: number,
  servicePackageId: number,
  payload: UpdateNotificationPreferencePayload,
  accessToken: string,
): Promise<ServicePackage> {
  const { data } = await axios.put(
    `${base(companyId, environmentId, serviceId)}/${servicePackageId}/notification-preference`,
    payload,
    auth(accessToken),
  );
  return data.data;
}

export function getServicePackageErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: string } | undefined)?.error;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}

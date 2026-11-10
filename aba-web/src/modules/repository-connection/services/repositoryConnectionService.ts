import axios from "axios";
import type {
  RepositoryConnection,
  CreateRepositoryConnectionPayload,
  RepositoryConnectionSecretReveal,
  UpdateTriggerSettingsPayload,
} from "@/modules/repository-connection/types/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function auth(accessToken: string) {
  return { headers: { Authorization: `Bearer ${accessToken}` } };
}

function base(companyId: string, environmentId: number, serviceId: number): string {
  return `${BASE_URL}/company/${companyId}/environments/${environmentId}/services/${serviceId}/repository-connection`;
}

export async function getRepositoryConnection(
  companyId: string,
  environmentId: number,
  serviceId: number,
  accessToken: string,
): Promise<RepositoryConnection | null> {
  const { data } = await axios.get(
    base(companyId, environmentId, serviceId),
    auth(accessToken),
  );
  return data.data;
}

export async function createRepositoryConnection(
  companyId: string,
  environmentId: number,
  serviceId: number,
  payload: CreateRepositoryConnectionPayload,
  accessToken: string,
): Promise<RepositoryConnectionSecretReveal> {
  const { data } = await axios.post(
    base(companyId, environmentId, serviceId),
    payload,
    auth(accessToken),
  );
  return data.data;
}

export async function rotateRepositoryConnectionSecret(
  companyId: string,
  environmentId: number,
  serviceId: number,
  accessToken: string,
): Promise<RepositoryConnectionSecretReveal> {
  const { data } = await axios.post(
    `${base(companyId, environmentId, serviceId)}/rotate-secret`,
    undefined,
    auth(accessToken),
  );
  return data.data;
}

export async function updateRepositoryConnectionTriggerSettings(
  companyId: string,
  environmentId: number,
  serviceId: number,
  payload: UpdateTriggerSettingsPayload,
  accessToken: string,
): Promise<RepositoryConnection> {
  const { data } = await axios.put(
    `${base(companyId, environmentId, serviceId)}/trigger-settings`,
    payload,
    auth(accessToken),
  );
  return data.data;
}

export async function deleteRepositoryConnection(
  companyId: string,
  environmentId: number,
  serviceId: number,
  accessToken: string,
): Promise<void> {
  await axios.delete(
    base(companyId, environmentId, serviceId),
    auth(accessToken),
  );
}

export function getRepositoryConnectionErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: string } | undefined)?.error;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}

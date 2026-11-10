import axios from "axios";
import type {
  AiAssistStatus,
  CreateTestDefinitionInput,
  CreateTestPageInput,
  ExplainRunResult,
  ImproveTestResult,
  ListResult,
  SuggestTestsResult,
  TestDefinition,
  TestRun,
  TestRunWithResults,
  TestPage,
  UpdateTestDefinitionInput,
  UpdateTestPageInput,
} from "@/modules/service-test/types/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

function auth(accessToken: string) {
  return { headers: { Authorization: `Bearer ${accessToken}` } };
}

function serviceBase(
  companyId: string,
  environmentId: number,
  serviceId: number,
): string {
  return `${BASE_URL}/company/${companyId}/environments/${environmentId}/services/${serviceId}`;
}

// ── Targets ─────────────────────────────────────────────────────────────────

export async function getTestPages(
  companyId: string,
  environmentId: number,
  serviceId: number,
  accessToken: string,
): Promise<ListResult<TestPage>> {
  const { data } = await axios.get(
    `${serviceBase(companyId, environmentId, serviceId)}/test-pages`,
    auth(accessToken),
  );
  return data.data;
}

export async function createTestPage(
  companyId: string,
  environmentId: number,
  serviceId: number,
  input: CreateTestPageInput,
  accessToken: string,
): Promise<TestPage> {
  const { data } = await axios.post(
    `${serviceBase(companyId, environmentId, serviceId)}/test-pages`,
    input,
    auth(accessToken),
  );
  return data.data;
}

export async function updateTestPage(
  companyId: string,
  environmentId: number,
  serviceId: number,
  targetId: number,
  input: UpdateTestPageInput,
  accessToken: string,
): Promise<TestPage> {
  const { data } = await axios.patch(
    `${serviceBase(companyId, environmentId, serviceId)}/test-pages/${targetId}`,
    input,
    auth(accessToken),
  );
  return data.data;
}

export async function deleteTestPage(
  companyId: string,
  environmentId: number,
  serviceId: number,
  targetId: number,
  accessToken: string,
): Promise<void> {
  await axios.delete(
    `${serviceBase(companyId, environmentId, serviceId)}/test-pages/${targetId}`,
    auth(accessToken),
  );
}

// ── Definitions ───────────────────────────────────────────────────────────

export async function getTestDefinitions(
  companyId: string,
  environmentId: number,
  serviceId: number,
  targetId: number,
  accessToken: string,
): Promise<ListResult<TestDefinition>> {
  const { data } = await axios.get(
    `${serviceBase(companyId, environmentId, serviceId)}/test-pages/${targetId}/test-definitions`,
    auth(accessToken),
  );
  return data.data;
}

export async function createTestDefinition(
  companyId: string,
  environmentId: number,
  serviceId: number,
  targetId: number,
  input: CreateTestDefinitionInput,
  accessToken: string,
): Promise<TestDefinition> {
  const { data } = await axios.post(
    `${serviceBase(companyId, environmentId, serviceId)}/test-pages/${targetId}/test-definitions`,
    input,
    auth(accessToken),
  );
  return data.data;
}

export async function updateTestDefinition(
  companyId: string,
  environmentId: number,
  serviceId: number,
  targetId: number,
  definitionId: number,
  input: UpdateTestDefinitionInput,
  accessToken: string,
): Promise<TestDefinition> {
  const { data } = await axios.patch(
    `${serviceBase(companyId, environmentId, serviceId)}/test-pages/${targetId}/test-definitions/${definitionId}`,
    input,
    auth(accessToken),
  );
  return data.data;
}

export async function deleteTestDefinition(
  companyId: string,
  environmentId: number,
  serviceId: number,
  targetId: number,
  definitionId: number,
  accessToken: string,
): Promise<void> {
  await axios.delete(
    `${serviceBase(companyId, environmentId, serviceId)}/test-pages/${targetId}/test-definitions/${definitionId}`,
    auth(accessToken),
  );
}

// ── Runs ──────────────────────────────────────────────────────────────────

export async function getTestRuns(
  companyId: string,
  environmentId: number,
  serviceId: number,
  accessToken: string,
): Promise<ListResult<TestRun>> {
  const { data } = await axios.get(
    `${serviceBase(companyId, environmentId, serviceId)}/test-runs`,
    auth(accessToken),
  );
  return data.data;
}

export async function getTestRun(
  companyId: string,
  environmentId: number,
  serviceId: number,
  runId: number,
  accessToken: string,
): Promise<TestRunWithResults> {
  const { data } = await axios.get(
    `${serviceBase(companyId, environmentId, serviceId)}/test-runs/${runId}`,
    auth(accessToken),
  );
  return data.data;
}

export async function runTests(
  companyId: string,
  environmentId: number,
  serviceId: number,
  opts: { pageId?: number; definitionId?: number },
  accessToken: string,
): Promise<TestRun> {
  const body: Record<string, number> = {};
  if (opts.pageId) body.pageId = opts.pageId;
  if (opts.definitionId) body.definitionId = opts.definitionId;
  const { data } = await axios.post(
    `${serviceBase(companyId, environmentId, serviceId)}/test-runs`,
    body,
    auth(accessToken),
  );
  return data.data;
}

export async function cloneTestDefinition(
  companyId: string,
  environmentId: number,
  serviceId: number,
  pageId: number,
  definitionId: number,
  accessToken: string,
): Promise<TestDefinition> {
  const { data } = await axios.post(
    `${serviceBase(companyId, environmentId, serviceId)}/test-pages/${pageId}/test-definitions/${definitionId}/clone`,
    {},
    auth(accessToken),
  );
  return data.data;
}

// ── AI assist (Phase B) ─────────────────────────────────────────────────────

export async function getAiStatus(
  companyId: string,
  environmentId: number,
  serviceId: number,
  accessToken: string,
): Promise<AiAssistStatus> {
  const { data } = await axios.get(
    `${serviceBase(companyId, environmentId, serviceId)}/ai/status`,
    auth(accessToken),
  );
  return data.data;
}

export async function aiSuggestTests(
  companyId: string,
  environmentId: number,
  serviceId: number,
  pageId: number,
  body: { count?: number; instructions?: string },
  accessToken: string,
): Promise<SuggestTestsResult> {
  const { data } = await axios.post(
    `${serviceBase(companyId, environmentId, serviceId)}/test-pages/${pageId}/ai/suggest-tests`,
    body,
    auth(accessToken),
  );
  return data.data;
}

export async function aiExplainRun(
  companyId: string,
  environmentId: number,
  serviceId: number,
  runId: number,
  accessToken: string,
): Promise<ExplainRunResult> {
  const { data } = await axios.post(
    `${serviceBase(companyId, environmentId, serviceId)}/test-runs/${runId}/ai/explain`,
    {},
    auth(accessToken),
  );
  return data.data;
}

export async function aiImproveTest(
  companyId: string,
  environmentId: number,
  serviceId: number,
  pageId: number,
  definitionId: number,
  body: { instructions?: string },
  accessToken: string,
): Promise<ImproveTestResult> {
  const { data } = await axios.post(
    `${serviceBase(companyId, environmentId, serviceId)}/test-pages/${pageId}/test-definitions/${definitionId}/ai/improve`,
    body,
    auth(accessToken),
  );
  return data.data;
}

export function getTestErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: string } | undefined)
      ?.error;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}

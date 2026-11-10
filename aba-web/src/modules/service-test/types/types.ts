export type TestAuthKind = "NONE" | "BEARER_TOKEN" | "API_KEY_HEADER" | "BASIC";
export type TestPageStatus = "ACTIVE" | "ARCHIVED";
export type TestPageType =
  | "LOGIN"
  | "REGISTER"
  | "CHECKOUT"
  | "SEARCH"
  | "PROFILE"
  | "CONTACT"
  | "LANDING"
  | "DASHBOARD"
  | "API_ENDPOINT"
  | "CUSTOM"
  | "OTHER";

export const PAGE_TYPES: TestPageType[] = [
  "LOGIN",
  "REGISTER",
  "CHECKOUT",
  "SEARCH",
  "PROFILE",
  "CONTACT",
  "LANDING",
  "DASHBOARD",
  "API_ENDPOINT",
  "CUSTOM",
  "OTHER",
];

export type FormFieldType =
  | "text"
  | "password"
  | "email"
  | "number"
  | "checkbox"
  | "hidden"
  | "captcha"
  | "textarea"
  | "select";

export const FORM_FIELD_TYPES: FormFieldType[] = [
  "text",
  "password",
  "email",
  "number",
  "checkbox",
  "hidden",
  "captcha",
  "textarea",
  "select",
];

export interface SimulatedFormField {
  name: string;
  type: FormFieldType;
  value?: string;
  secret?: boolean;
}

export type RequestContentType = "json" | "form-urlencoded" | "multipart";

export type ScenarioCondition =
  | "VALID_TOKEN"
  | "NO_TOKEN"
  | "INVALID_TOKEN"
  | "EXPIRED_TOKEN"
  | "CUSTOM";

export const SCENARIO_CONDITIONS: { value: ScenarioCondition; label: string }[] = [
  { value: "VALID_TOKEN", label: "With valid token" },
  { value: "NO_TOKEN", label: "Without token" },
  { value: "INVALID_TOKEN", label: "With invalid token" },
  { value: "EXPIRED_TOKEN", label: "With expired token" },
  { value: "CUSTOM", label: "Custom headers / token" },
];
export type TestType = "GLOBAL_SECURITY" | "CUSTOM_API" | "BROWSER";
export type TestEngine = "POSTMAN" | "PLAYWRIGHT";
export type TestDefinitionSource =
  | "MANUAL"
  | "AI_SUGGESTED"
  | "SWAGGER_IMPORT"
  | "POSTMAN_IMPORT";
export type TestRunTrigger = "MANUAL" | "SCHEDULED" | "WEBHOOK";
export type TestRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "PASSED"
  | "FAILED"
  | "ERROR"
  | "CANCELLED";
export type TestResultStatus = "PASSED" | "FAILED" | "ERROR" | "SKIPPED";

export const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export interface TestPage {
  id: number;
  name: string;
  description: string | null;
  pageType: TestPageType;
  path: string | null;
  absoluteUrl: string | null;
  method: string;
  status: TestPageStatus;
  accessConfig: Record<string, unknown> | null;
  authKind: TestAuthKind;
  hasAuthSecret: boolean;
  scheduleEnabled: boolean;
  scheduleIntervalHours: number | null;
  nextScheduledAt: string | null;
  runOnWebhook: boolean;
  serviceId: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestDefinition {
  id: number;
  name: string;
  type: TestType;
  engine: TestEngine;
  source: TestDefinitionSource;
  templateKey: string | null;
  enabled: boolean;
  config: Record<string, unknown> | null;
  assertions: Record<string, unknown> | null;
  testTargetId: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssertionResult {
  assertion: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  message?: string;
}

export interface TestResult {
  id: number;
  name: string;
  status: TestResultStatus;
  durationMs: number | null;
  request: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  assertionResults: AssertionResult[] | null;
  errorMessage: string | null;
  createdAt: string;
  testRunId: number;
  testDefinitionId: number | null;
}

export interface TestRun {
  id: number;
  runKey: string;
  trigger: TestRunTrigger;
  status: TestRunStatus;
  totalCount: number;
  passedCount: number;
  failedCount: number;
  errorCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  serviceId: number;
  testTargetId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestRunWithResults extends TestRun {
  results: TestResult[];
}

export interface CreateTestPageInput {
  name: string;
  description?: string;
  pageType: TestPageType;
  path?: string;
  absoluteUrl?: string;
  method: string;
  accessConfig?: Record<string, unknown>;
  authKind: TestAuthKind;
  authSecret?: string;
}

export type UpdateTestPageInput = Partial<CreateTestPageInput> & {
  status?: TestPageStatus;
};

export interface CreateTestDefinitionInput {
  name: string;
  type: TestType;
  engine?: TestEngine;
  source?: TestDefinitionSource;
  enabled: boolean;
  templateKey?: string;
  config?: Record<string, unknown>;
  assertions?: Record<string, unknown>;
}

// ── AI assist (Phase B) ─────────────────────────────────────────────────────

export interface AiAssistStatus {
  offered: boolean;
  apiKeyConfigured: boolean;
  enabled: boolean;
  monthlyAllowance: number;
  purchasedThisPeriod: number;
  usedThisPeriod: number;
  remaining: number;
  periodStart: string;
}

export interface AiUsageInfo {
  model: string;
  inputTokens: number;
  outputTokens: number;
  remaining: number;
}

export interface TestSuggestion {
  title: string;
  summary: string;
  detail: string;
  type: TestType;
  config: Record<string, unknown> | null;
  assertions: Record<string, unknown> | null;
}

export interface SuggestTestsResult {
  suggestions: TestSuggestion[];
  usage: AiUsageInfo;
}

export interface ExplainRunResult {
  summary: string;
  perTest: { name: string; verdict: string; explanation: string }[];
  recommendations: string[];
  usage: AiUsageInfo;
}

export interface ImproveTestResult {
  rationale: string;
  improved: {
    name: string | null;
    config: Record<string, unknown> | null;
    assertions: Record<string, unknown> | null;
  };
  usage: AiUsageInfo;
}

export type UpdateTestDefinitionInput = {
  name?: string;
  engine?: TestEngine;
  enabled?: boolean;
  templateKey?: string | null;
  config?: Record<string, unknown> | null;
  assertions?: Record<string, unknown> | null;
};

export interface ListResult<T> {
  data: T[];
  total: number;
}

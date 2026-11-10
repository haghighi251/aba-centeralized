import axios, { AxiosResponse } from 'axios';
import { TestType } from '@aba/database';
import {
  AssertionResult,
  TestResultItem,
  TestScheduledDefinition,
  TestScheduledTarget,
} from '@/infrastructure/kafka/types/testRunMessages';

/**
 * Pluggable execution engine. Phase 1 ships only HttpTestExecutor (axios) for
 * CUSTOM_API; a Playwright engine for GLOBAL_SECURITY/BROWSER slots in behind
 * this same interface later.
 *
 * A test can define an auth/scenario matrix (run the same request with a valid
 * token, without a token, with an expired/invalid token, …) — so `run` returns
 * ONE result per scenario, not one per test.
 */
export interface TestExecutor {
  canRun(definition: TestScheduledDefinition): boolean;
  run(
    target: TestScheduledTarget,
    definition: TestScheduledDefinition,
    ctx: ExecutionContext,
  ): Promise<TestResultItem[]>;
}

export interface ExecutionContext {
  baseUrl: string;
  /** Decrypted valid auth secret for the target (null for NONE / none stored). */
  authSecret: string | null;
  /** Default per-request timeout in ms (a test may override via timeoutSeconds). */
  timeoutMs: number;
}

const MAX_BODY_SNAPSHOT = 4000;

// ── Config shapes (mirror aba-bl's schemas) ─────────────────────────────────

interface JsonPathAssertion {
  path: string;
  equals?: unknown;
  exists?: boolean;
  matches?: string;
}

interface Assertions {
  status?: number | number[];
  headers?: Record<string, string>;
  jsonPath?: JsonPathAssertion[];
  bodyContains?: string[];
  negative?: boolean;
}

type ScenarioCondition =
  | 'VALID_TOKEN'
  | 'NO_TOKEN'
  | 'INVALID_TOKEN'
  | 'EXPIRED_TOKEN'
  | 'CUSTOM';

interface Scenario {
  name?: string;
  condition?: ScenarioCondition;
  tokenOverride?: string;
  headerOverrides?: Record<string, string>;
  expect?: Assertions;
}

interface FormField {
  name: string;
  type?: string;
  value?: string;
  secret?: boolean;
}

interface Config {
  method?: string;
  pathOverride?: string;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  contentType?: 'json' | 'form-urlencoded' | 'multipart';
  form?: { name?: string; fields?: FormField[] };
  body?: unknown;
  timeoutSeconds?: number;
  scenarios?: Scenario[];
}

const SCENARIO_LABEL: Record<ScenarioCondition, string> = {
  VALID_TOKEN: 'with valid token',
  NO_TOKEN: 'without token',
  INVALID_TOKEN: 'with invalid token',
  EXPIRED_TOKEN: 'with expired token',
  CUSTOM: 'custom',
};

/** The in-process axios engine for CUSTOM_API tests. */
export class HttpTestExecutor implements TestExecutor {
  canRun(definition: TestScheduledDefinition): boolean {
    return definition.type === TestType.CUSTOM_API;
  }

  async run(
    target: TestScheduledTarget,
    definition: TestScheduledDefinition,
    ctx: ExecutionContext,
  ): Promise<TestResultItem[]> {
    const config = (definition.config ?? {}) as Config;

    // Empty matrix → a single implicit VALID_TOKEN run using test-level assertions.
    const scenarios: Scenario[] =
      config.scenarios && config.scenarios.length > 0
        ? config.scenarios
        : [
            {
              condition: 'VALID_TOKEN',
              expect: (definition.assertions ?? {}) as Assertions,
            },
          ];

    const results: TestResultItem[] = [];
    for (const scenario of scenarios) {
      results.push(
        await this.runScenario(target, definition, ctx, config, scenario),
      );
    }
    return results;
  }

  private async runScenario(
    target: TestScheduledTarget,
    definition: TestScheduledDefinition,
    ctx: ExecutionContext,
    config: Config,
    scenario: Scenario,
  ): Promise<TestResultItem> {
    const condition: ScenarioCondition = scenario.condition ?? 'VALID_TOKEN';
    const label =
      scenario.name?.trim() || SCENARIO_LABEL[condition] || 'scenario';
    const resultName = `${definition.name} — ${label}`;
    const accessConfig = (target.accessConfig ?? {}) as Record<string, unknown>;

    const method = (config.method ?? target.method ?? 'GET').toUpperCase();
    const url = resolveUrl(ctx.baseUrl, target, config);

    const headers = buildBaseHeaders(accessConfig, config);
    applyScenarioAuth(headers, target.authKind, scenario, ctx.authSecret, accessConfig);

    const { data, contentType } = buildBody(config);
    if (contentType && !hasHeader(headers, 'content-type')) {
      headers['Content-Type'] = contentType;
    }

    const timeout =
      config.timeoutSeconds && config.timeoutSeconds > 0
        ? config.timeoutSeconds * 1000
        : ctx.timeoutMs;

    const requestSnapshot = {
      scenario: label,
      method,
      url,
      headers: maskHeaders(headers),
      query: config.query ?? null,
      body: maskBody(config, data),
    };

    const startedAt = Date.now();
    let response: AxiosResponse;
    try {
      response = await axios.request({
        method,
        url,
        headers,
        params: config.query,
        data,
        timeout,
        validateStatus: () => true,
        transformResponse: (d) => d,
      });
    } catch (error) {
      return {
        definitionId: definition.definitionId,
        name: resultName,
        status: 'ERROR',
        durationMs: Date.now() - startedAt,
        request: requestSnapshot,
        response: null,
        assertionResults: null,
        errorMessage: (error as Error)?.message ?? 'Request failed.',
      };
    }

    const durationMs = Date.now() - startedAt;
    const rawBody =
      typeof response.data === 'string'
        ? response.data
        : safeStringify(response.data);

    const assertionResults = evaluateAssertions(scenario.expect ?? {}, {
      status: response.status,
      headers: normalizeHeaders(response.headers as Record<string, unknown>),
      rawBody,
    });
    const allPassed = assertionResults.every((a) => a.passed);

    return {
      definitionId: definition.definitionId,
      name: resultName,
      status: allPassed ? 'PASSED' : 'FAILED',
      durationMs,
      request: requestSnapshot,
      response: {
        status: response.status,
        headers: normalizeHeaders(response.headers as Record<string, unknown>),
        body: rawBody.slice(0, MAX_BODY_SNAPSHOT),
        truncated: rawBody.length > MAX_BODY_SNAPSHOT,
      },
      assertionResults,
      errorMessage: null,
    };
  }
}

// ── Pure helpers (exported for unit tests) ──────────────────────────────────

export function resolveUrl(
  baseUrl: string,
  target: TestScheduledTarget,
  config: Config,
): string {
  const override = config.pathOverride;
  if (override && /^https?:\/\//i.test(override)) return override;
  if (target.absoluteUrl && !override) return target.absoluteUrl;

  const base = (target.absoluteUrl ?? baseUrl ?? '').replace(/\/+$/, '');
  const path = override ?? target.path ?? '';
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}/${path.replace(/^\/+/, '')}`;
}

/** Non-auth headers: page custom headers then test headers. */
export function buildBaseHeaders(
  accessConfig: Record<string, unknown>,
  config: Config,
): Record<string, string> {
  const headers: Record<string, string> = {};
  const custom = accessConfig.customHeaders as Record<string, string> | undefined;
  if (custom) Object.assign(headers, custom);
  if (config.headers) Object.assign(headers, config.headers);
  return headers;
}

/** Apply the scenario's auth condition on top of the base headers. */
export function applyScenarioAuth(
  headers: Record<string, string>,
  authKind: string,
  scenario: Scenario,
  validSecret: string | null,
  accessConfig: Record<string, unknown>,
): void {
  const condition: ScenarioCondition = scenario.condition ?? 'VALID_TOKEN';
  switch (condition) {
    case 'NO_TOKEN':
      return;
    case 'VALID_TOKEN':
      setAuthHeader(headers, authKind, validSecret, accessConfig);
      return;
    case 'INVALID_TOKEN':
      setAuthHeader(
        headers,
        authKind,
        `invalid-token-${Math.random().toString(36).slice(2)}`,
        accessConfig,
      );
      return;
    case 'EXPIRED_TOKEN':
      // Use a customer-supplied known-expired token when given; otherwise a
      // clearly-bogus value (still proves the endpoint rejects it).
      setAuthHeader(
        headers,
        authKind,
        scenario.tokenOverride || 'expired-token-placeholder',
        accessConfig,
      );
      return;
    case 'CUSTOM':
      if (scenario.tokenOverride) {
        setAuthHeader(headers, authKind, scenario.tokenOverride, accessConfig);
      }
      if (scenario.headerOverrides) Object.assign(headers, scenario.headerOverrides);
      return;
  }
}

function setAuthHeader(
  headers: Record<string, string>,
  authKind: string,
  secret: string | null,
  accessConfig: Record<string, unknown>,
): void {
  if (!secret) return;
  switch (authKind) {
    case 'BEARER_TOKEN':
      headers.Authorization = `Bearer ${secret}`;
      break;
    case 'BASIC':
      headers.Authorization = `Basic ${Buffer.from(secret).toString('base64')}`;
      break;
    case 'API_KEY_HEADER': {
      const headerName =
        (accessConfig.apiKeyHeader as string | undefined) ?? 'X-API-Key';
      headers[headerName] = secret;
      break;
    }
    default:
      break;
  }
}

/**
 * Turn a test's config into the request body + its Content-Type. A simulated
 * `form` (fields → key/value) honours `contentType` (form-urlencoded default
 * for forms; json if asked; multipart falls back to form-urlencoded in Phase A),
 * otherwise the raw `body` as JSON. `{ data: undefined }` means nothing to send.
 */
export function buildBody(config: Config): {
  data: unknown;
  contentType?: string;
} {
  const fields = config.form?.fields ?? [];
  if (fields.length > 0) {
    const kv: Record<string, string> = {};
    for (const f of fields) kv[f.name] = f.value ?? '';

    const ct = config.contentType ?? 'form-urlencoded';
    if (ct === 'json') {
      return { data: kv, contentType: 'application/json' };
    }
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(kv)) params.append(k, v);
    return {
      data: params.toString(),
      contentType: 'application/x-www-form-urlencoded',
    };
  }

  if (config.body !== undefined && config.body !== null) {
    if (config.contentType === 'form-urlencoded') {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(
        config.body as Record<string, unknown>,
      )) {
        params.append(k, String(v));
      }
      return {
        data: params.toString(),
        contentType: 'application/x-www-form-urlencoded',
      };
    }
    return { data: config.body, contentType: 'application/json' };
  }

  return { data: undefined };
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((k) => k.toLowerCase() === name.toLowerCase());
}

function maskBody(config: Config, data: unknown): unknown {
  const secretNames = (config.form?.fields ?? [])
    .filter((f) => f.secret || f.type === 'password')
    .map((f) => f.name);
  if (secretNames.length === 0) return data ?? null;
  const masked: Record<string, string> = {};
  for (const f of config.form?.fields ?? []) {
    masked[f.name] = secretNames.includes(f.name) ? '***' : f.value ?? '';
  }
  return masked;
}

export function evaluateAssertions(
  assertions: Assertions,
  res: { status: number; headers: Record<string, string>; rawBody: string },
): AssertionResult[] {
  const results: AssertionResult[] = [];

  if (assertions.status !== undefined) {
    const expected = Array.isArray(assertions.status)
      ? assertions.status
      : [assertions.status];
    results.push({
      assertion: 'status',
      passed: expected.includes(res.status),
      expected,
      actual: res.status,
    });
  }

  if (assertions.headers) {
    for (const [key, expected] of Object.entries(assertions.headers)) {
      const actual = res.headers[key.toLowerCase()];
      const passed =
        actual !== undefined && (expected === '' ? true : actual.includes(expected));
      results.push({
        assertion: `header:${key}`,
        passed,
        expected: expected === '' ? '(present)' : expected,
        actual: actual ?? null,
      });
    }
  }

  if (assertions.jsonPath && assertions.jsonPath.length > 0) {
    let parsed: unknown;
    let parseOk = true;
    try {
      parsed = JSON.parse(res.rawBody);
    } catch {
      parseOk = false;
    }
    for (const jp of assertions.jsonPath) {
      if (!parseOk) {
        results.push({
          assertion: `jsonPath:${jp.path}`,
          passed: false,
          message: 'Response body is not valid JSON.',
        });
        continue;
      }
      results.push(evaluateJsonPath(jp, resolveJsonPath(parsed, jp.path)));
    }
  }

  if (assertions.bodyContains) {
    for (const needle of assertions.bodyContains) {
      results.push({
        assertion: `bodyContains:${needle}`,
        passed: res.rawBody.includes(needle),
        expected: needle,
      });
    }
  }

  if (results.length === 0) {
    results.push({ assertion: 'requestCompleted', passed: true, actual: res.status });
  }

  return results;
}

function evaluateJsonPath(jp: JsonPathAssertion, value: unknown): AssertionResult {
  const base = `jsonPath:${jp.path}`;
  if (jp.exists !== undefined) {
    const exists = value !== undefined;
    return {
      assertion: base,
      passed: exists === jp.exists,
      expected: jp.exists ? '(exists)' : '(absent)',
      actual: exists ? '(exists)' : '(absent)',
    };
  }
  if (jp.matches !== undefined) {
    const str = typeof value === 'string' ? value : safeStringify(value);
    let passed = false;
    try {
      passed = new RegExp(jp.matches).test(str);
    } catch {
      return { assertion: base, passed: false, message: `Invalid regex: ${jp.matches}` };
    }
    return { assertion: base, passed, expected: jp.matches, actual: str };
  }
  if (jp.equals !== undefined) {
    return {
      assertion: base,
      passed: deepEqual(value, jp.equals),
      expected: jp.equals,
      actual: value,
    };
  }
  return { assertion: base, passed: value !== undefined, actual: value };
}

export function resolveJsonPath(root: unknown, path: string): unknown {
  const segments = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let current: unknown = root;
  for (const seg of segments) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[seg];
  }
  return current;
}

function deepEqual(a: unknown, b: unknown): boolean {
  return safeStringify(a) === safeStringify(b);
}

function normalizeHeaders(headers: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    out[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : String(value);
  }
  return out;
}

function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = key.toLowerCase() === 'authorization' ? '***' : value;
  }
  return out;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

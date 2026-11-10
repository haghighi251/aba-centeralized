/**
 * Prompt builders for the three AI-assist features. Each asks Claude to reply
 * with a single JSON document (no prose) so the server can parse it; we also
 * validate the structured parts (config/assertions) against our own Zod schemas
 * before trusting them.
 */

const PLATFORM_CONTEXT = `You are a security-testing assistant for a SECaaS platform. \
Customers register pages/endpoints of their microservices and attach E2E security \
tests (an HTTP request + assertions, optionally run under several auth scenarios). \
A "CUSTOM_API" test sends one HTTP request and asserts on the response; \
"GLOBAL_SECURITY" and "BROWSER" tests run later via Playwright. \
Focus on realistic application-security checks: authn/authz bypass, missing CSRF \
tokens, injection (SQLi/XSS), insecure methods, missing security headers \
(CSP/HSTS/X-Frame-Options), CORS misconfiguration, and error-handling leaks.`;

/** The config/assertions shape the UI understands, described for the model. */
const TEST_SHAPE = `A test's "config" may contain: method (GET/POST/...), pathOverride, \
headers (object of string), query (object of string), contentType \
("json"|"form-urlencoded"|"multipart"), form { name?, fields: [{ name, type, value?, secret? }] }, \
body (any), timeoutSeconds, and scenarios: [{ condition \
("VALID_TOKEN"|"NO_TOKEN"|"INVALID_TOKEN"|"EXPIRED_TOKEN"|"CUSTOM"), name?, tokenOverride?, \
headerOverrides?, expect: { status (number|number[]), headers?, bodyContains? (string[]), negative? } }]. \
A test's "assertions" has the same shape as a scenario's "expect". \
Keep configs minimal and valid; never invent real credentials.`;

function truncate(value: unknown, max = 2000): string {
  const s = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  return s.length > max ? s.slice(0, max) + '…[truncated]' : s;
}

export interface SuggestPageContext {
  name: string;
  pageType: string;
  method: string | null;
  pathOrUrl: string | null;
  authKind: string;
  accessConfig: unknown;
  existingTestNames: string[];
}

export function buildSuggestPrompt(
  ctx: SuggestPageContext,
  count: number,
  instructions?: string,
): { system: string; user: string } {
  const system = `${PLATFORM_CONTEXT}\n\n${TEST_SHAPE}\n\n\
Return ONLY a JSON object: { "suggestions": [ { "title": string, "summary": string, \
"detail": string, "type": "CUSTOM_API"|"GLOBAL_SECURITY"|"BROWSER", "config": object, \
"assertions": object } ] }. "title" is a short label, "summary" one line, "detail" a \
2–4 sentence explanation of what the test proves and why it matters. Prefer CUSTOM_API \
tests that can run today. Do not duplicate the existing tests listed.`;

  const user = `Suggest ${count} new security tests for this page.\n\
Page name: ${ctx.name}\nType: ${ctx.pageType}\nMethod: ${ctx.method ?? 'n/a'}\n\
Path/URL: ${ctx.pathOrUrl ?? 'n/a'}\nAuth: ${ctx.authKind}\n\
Access config: ${truncate(ctx.accessConfig, 800)}\n\
Existing tests (do not repeat): ${ctx.existingTestNames.join(', ') || 'none'}\n${
    instructions ? `\nExtra guidance from the user: ${instructions}` : ''
  }`;

  return { system, user };
}

export interface ExplainRunResult {
  name: string;
  status: string;
  request: unknown;
  response: unknown;
  assertionResults: unknown;
  errorMessage: string | null;
}

export function buildExplainPrompt(
  runSummary: {
    status: string;
    trigger: string;
    totalCount: number;
    passedCount: number;
    failedCount: number;
    errorCount: number;
  },
  results: ExplainRunResult[],
): { system: string; user: string } {
  const system = `${PLATFORM_CONTEXT}\n\n\
You are reviewing the results of a completed security test run. Explain, in plain \
language a developer can act on, what passed and failed, the likely security \
implication of each failure, and concrete remediation steps. \
Return ONLY a JSON object: { "summary": string, "perTest": [ { "name": string, \
"verdict": "pass"|"fail"|"error"|"info", "explanation": string } ], \
"recommendations": string[] }.`;

  const resultsText = results
    .map(
      (r, i) =>
        `#${i + 1} ${r.name} — ${r.status}\n  request: ${truncate(
          r.request,
          600,
        )}\n  response: ${truncate(r.response, 900)}\n  assertions: ${truncate(
          r.assertionResults,
          900,
        )}${r.errorMessage ? `\n  error: ${r.errorMessage}` : ''}`,
    )
    .join('\n');

  const user = `Run status: ${runSummary.status} (trigger ${runSummary.trigger}). \
Totals — passed ${runSummary.passedCount}, failed ${runSummary.failedCount}, errors \
${runSummary.errorCount} of ${runSummary.totalCount}.\n\nPer-test results:\n${resultsText}`;

  return { system, user };
}

export function buildImprovePrompt(
  pageCtx: SuggestPageContext,
  current: {
    name: string;
    type: string;
    config: unknown;
    assertions: unknown;
  },
  instructions?: string,
): { system: string; user: string } {
  const system = `${PLATFORM_CONTEXT}\n\n${TEST_SHAPE}\n\n\
Improve the given test: strengthen its assertions, add missing security scenarios \
(e.g. a NO_TOKEN negative check on an authenticated endpoint), and fix weak or \
unsafe configuration — without changing what the test fundamentally targets. \
Return ONLY a JSON object: { "rationale": string, "improved": { "name": string, \
"config": object, "assertions": object } }. The improved config/assertions must use \
the shape described above.`;

  const user = `Page: ${pageCtx.name} (${pageCtx.pageType}, auth ${pageCtx.authKind}, \
method ${pageCtx.method ?? 'n/a'}).\nCurrent test: ${current.name} [${current.type}]\n\
Current config: ${truncate(current.config, 1500)}\n\
Current assertions: ${truncate(current.assertions, 800)}\n${
    instructions ? `\nExtra guidance from the user: ${instructions}` : ''
  }`;

  return { system, user };
}

/**
 * Extract the first JSON value from a model reply, tolerating ```json fences
 * and surrounding prose. Returns null if nothing parses.
 */
export function extractJson<T = unknown>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  // Try the whole candidate first.
  const direct = tryParse<T>(candidate.trim());
  if (direct !== null) return direct;
  // Fall back to the first {...} or [...] span.
  const start = candidate.search(/[[{]/);
  if (start === -1) return null;
  const open = candidate[start];
  const close = open === '{' ? '}' : ']';
  const end = candidate.lastIndexOf(close);
  if (end <= start) return null;
  return tryParse<T>(candidate.slice(start, end + 1));
}

function tryParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

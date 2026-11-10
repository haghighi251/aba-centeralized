import { TestEngine, TestType } from '@aba/database';

/**
 * Wire contract for the `test.scheduled` topic.
 *
 * Produced by aba-bl's TestRun module, consumed by worker's Test Executor.
 * Both sides must keep this shape in sync — there is no shared npm package for
 * Kafka contracts in this monorepo, so the same interface is duplicated (not
 * imported) on the worker side in
 * `worker/src/infrastructure/kafka/types/testRunMessages.ts`.
 *
 * IMPORTANT: this message never carries auth secrets. The executor resolves
 * decrypted auth material out-of-band via the internal materials endpoint
 * (`POST /internal/test-runs/:runKey/materials`, guarded by INTERNAL_API_KEY),
 * keyed by `runKey`, so credentials never land on the durable Kafka log.
 */
export interface TestScheduledMessage {
  /** Correlates a test.scheduled request with its test.result reply. */
  runKey: string;
  companyId: number;
  serviceId: number;
  /** Service base URL; targets resolve their relative `path` against this. */
  baseUrl: string;
  /** Token-bucket config the executor throttles itself with ({ windowMs, max }). */
  rateLimitConfig: { windowMs: number; max: number } | null;
  targets: TestScheduledTarget[];
}

export interface TestScheduledTarget {
  targetId: number;
  name: string;
  /** Relative path (resolved against baseUrl) — null when absoluteUrl is set. */
  path: string | null;
  absoluteUrl: string | null;
  method: string;
  /** How this target authenticates; the secret itself is fetched separately. */
  authKind: string;
  /** Non-secret posture/headers the definitions assert against. */
  accessConfig: Record<string, unknown> | null;
  definitions: TestScheduledDefinition[];
}

export interface TestScheduledDefinition {
  definitionId: number;
  name: string;
  type: TestType;
  engine: TestEngine;
  config: Record<string, unknown> | null;
  assertions: Record<string, unknown> | null;
  templateKey: string | null;
}

/**
 * Wire contract for the `test.result` topic.
 *
 * Produced by worker's Test Executor after running a scheduled set, consumed
 * by aba-bl's TestResultConsumerService to persist results and finalise the
 * TestRun.
 */
export interface TestResultMessage {
  runKey: string;
  companyId: number;
  serviceId: number;
  results: TestResultItem[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    error: number;
  };
}

export interface TestResultItem {
  definitionId: number;
  /** Snapshot of the definition name at run time. */
  name: string;
  status: 'PASSED' | 'FAILED' | 'ERROR' | 'SKIPPED';
  durationMs: number | null;
  request: Record<string, unknown> | null;
  response: Record<string, unknown> | null;
  assertionResults: AssertionResult[] | null;
  errorMessage: string | null;
}

export interface AssertionResult {
  assertion: string;
  passed: boolean;
  expected?: unknown;
  actual?: unknown;
  message?: string;
}

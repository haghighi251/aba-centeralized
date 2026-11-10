import { TestEngine, TestType } from '@aba/database';

/**
 * Wire contracts for the test.scheduled / test.result topics.
 *
 * DUPLICATED (not imported) from aba-bl's
 * `src/modules/kafka/types/testRunMessages.ts` — same monorepo convention as
 * packageScanMessages. Both sides must be kept in sync by hand.
 *
 * test.scheduled carries metadata only; the executor fetches decrypted auth
 * material from aba-bl's internal materials endpoint, keyed by runKey.
 */
export interface TestScheduledMessage {
  runKey: string;
  companyId: number;
  serviceId: number;
  baseUrl: string;
  rateLimitConfig: { windowMs: number; max: number } | null;
  targets: TestScheduledTarget[];
}

export interface TestScheduledTarget {
  targetId: number;
  name: string;
  path: string | null;
  absoluteUrl: string | null;
  method: string;
  authKind: string;
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

/** Shape of aba-bl's internal materials response (decrypted auth per target). */
export interface TestRunMaterials {
  runKey: string;
  targets: {
    targetId: number;
    authKind: string;
    authSecret: string | null;
  }[];
}

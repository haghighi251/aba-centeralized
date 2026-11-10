import { TestType } from '@aba/database';

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
  /** Validated against TestConfigSchema — safe to POST back to create a test. */
  config: Record<string, unknown> | null;
  /** Validated against TestAssertionsSchema. */
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

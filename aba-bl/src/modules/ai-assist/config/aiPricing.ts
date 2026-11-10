import { AiAssistFeature } from '@aba/database';

/**
 * Per-feature model routing + output caps and provider token prices.
 *
 * The token-allowance pool is **token-denominated**: a company's monthly
 * allowance is a number of tokens, and every call decrements it by the actual
 * `inputTokens + outputTokens` returned by Claude — regardless of model. The
 * USD prices below are used only to record real provider spend (`costMicroUsd`)
 * for margin reporting; they do not gate usage. Keeping the pool uniform while
 * routing bulk work (suggestions) to the cheap model (Haiku) and quality work
 * (explain / improve) to Opus keeps real spend low per allowance token.
 *
 * Prices are USD per 1,000,000 tokens (Anthropic published rates). Because the
 * unit is per-million, `tokens * usdPerMillion` yields the cost directly in
 * micro-USD (1e-6 USD) — see costMicroUsd() below.
 */
export interface ModelPricing {
  readonly inputUsdPerMillion: number;
  readonly outputUsdPerMillion: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-haiku-5-5': { inputUsdPerMillion: 0.1, outputUsdPerMillion: 0.5 },
  'claude-opus-5-5': { inputUsdPerMillion: 4.0, outputUsdPerMillion: 20.0 },
  'claude-sonnet-5-5': { inputUsdPerMillion: 2.0, outputUsdPerMillion: 10.0 },
};

export interface FeatureModelConfig {
  readonly model: string;
  /** Hard `max_tokens` cap for the call — also the reservation ceiling. */
  readonly maxOutputTokens: number;
}

/**
 * Model routing per README "model routing for cost control": cheap model for
 * bulk suggestions, Opus where quality matters (explain / improve).
 */
export const FEATURE_MODELS: Record<AiAssistFeature, FeatureModelConfig> = {
  [AiAssistFeature.SUGGEST_TESTS]: {
    model: 'claude-haiku-5-5',
    maxOutputTokens: 3000,
  },
  [AiAssistFeature.EXPLAIN_RUN]: {
    model: 'claude-opus-5-5',
    maxOutputTokens: 6000,
  },
  [AiAssistFeature.IMPROVE_TEST]: {
    model: 'claude-opus-5-5',
    maxOutputTokens: 6000,
  },
};

/** Required gross margin used to derive the customer sell price (reporting). */
export function tokenMargin(): number {
  const raw = Number(process.env.AI_TOKEN_MARGIN);
  return Number.isFinite(raw) && raw >= 0 ? raw : 0.6;
}

/** Real provider cost of a call in micro-USD (1e-6 USD). */
export function costMicroUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = MODEL_PRICING[model];
  if (!p) return 0;
  return Math.round(
    inputTokens * p.inputUsdPerMillion + outputTokens * p.outputUsdPerMillion,
  );
}

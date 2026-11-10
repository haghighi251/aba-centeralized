/** A company's AI-assist availability + token-allowance state for a period. */
export interface AiAssistStatus {
  /** Plan grants an allowance (> 0). AI is not offered on this plan otherwise. */
  offered: boolean;
  /** ANTHROPIC_API_KEY is set on the server. */
  apiKeyConfigured: boolean;
  /** offered && apiKeyConfigured — the master on/off the UI greys out from. */
  enabled: boolean;
  /** Tokens/month included in the plan (0 when not offered). */
  monthlyAllowance: number;
  /** Top-up tokens granted this period. */
  purchasedThisPeriod: number;
  /** input+output tokens consumed this period. */
  usedThisPeriod: number;
  /** allowance + purchased − used (never negative in the response). */
  remaining: number;
  /** Start of the current billing period (calendar month) — ISO string. */
  periodStart: string;
}

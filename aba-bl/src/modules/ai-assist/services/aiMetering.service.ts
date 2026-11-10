import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AiAssistFeature } from '@aba/database';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { AiUsageRepository } from '@/modules/ai-assist/repositories/aiUsage.repository';
import { AnthropicClientService } from '@/modules/ai-assist/services/anthropicClient.service';
import { AiAssistStatus } from '@/modules/ai-assist/types/aiStatus';
import { costMicroUsd } from '@/modules/ai-assist/config/aiPricing';

/**
 * Implements the token-metering → package-billing algorithm documented in
 * aba-bl/README.md#ai-assist-token-metering--package-billing. The allowance
 * pool is token-denominated and resets each calendar month; top-ups add to the
 * period they were granted in.
 */
@Injectable()
export class AiMeteringService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly aiUsageRepository: AiUsageRepository,
    private readonly anthropic: AnthropicClientService,
  ) {}

  private periodStart(now: Date = new Date()): Date {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /** Rough upper bound on prompt tokens (~4 chars/token) for the reservation. */
  estimatePromptTokens(system: string, user: string): number {
    return Math.ceil((system.length + user.length) / 4);
  }

  async getStatus(companyId: number): Promise<AiAssistStatus> {
    const since = this.periodStart();
    const company = await this.companyRepository.findById(companyId);
    const plan = (company as any)?.subscriptionPlan;
    const allowance: number = plan?.aiMonthlyTokenAllowance ?? 0;

    const [used, purchased] = await Promise.all([
      this.aiUsageRepository.sumConsumedTokensSince(companyId, since),
      this.aiUsageRepository.sumPurchasedTokensSince(companyId, since),
    ]);

    const offered = allowance > 0;
    const apiKeyConfigured = this.anthropic.isConfigured();
    const remaining = allowance + purchased - used;

    return {
      offered,
      apiKeyConfigured,
      enabled: offered && apiKeyConfigured,
      monthlyAllowance: allowance,
      purchasedThisPeriod: purchased,
      usedThisPeriod: used,
      remaining: Math.max(0, remaining),
      periodStart: since.toISOString(),
    };
  }

  /**
   * Availability + pre-call reservation (algorithm steps 1–2). Throws:
   * - 403 when AI is disabled (no allowance on plan, or no API key).
   * - 402 when the remaining allowance can't cover the reservation ceiling.
   * On success the caller makes exactly one capped Claude call then settles.
   */
  async reserve(companyId: number, estimateTokens: number): Promise<void> {
    const status = await this.getStatus(companyId);
    if (!status.offered) {
      throw new ForbiddenException(
        'AI assist is not included in your current plan. Upgrade to enable it.',
      );
    }
    if (!status.apiKeyConfigured) {
      throw new ForbiddenException(
        'AI assist is not configured on the server. Contact your administrator.',
      );
    }
    if (status.remaining < estimateTokens) {
      throw new HttpException(
        'AI token allowance exhausted — top up to continue.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
  }

  /** Post-call settle (algorithm step 4): record actual usage + real cost. */
  async settle(
    companyId: number,
    feature: AiAssistFeature,
    model: string,
    inputTokens: number,
    outputTokens: number,
    userId: number | null,
  ): Promise<void> {
    await this.aiUsageRepository.createUsageLog({
      companyId,
      feature,
      model,
      inputTokens,
      outputTokens,
      costMicroUsd: costMicroUsd(model, inputTokens, outputTokens),
      userId,
    });
  }
}

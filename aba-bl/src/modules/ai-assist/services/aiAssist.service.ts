import { Injectable, NotFoundException } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import { AiAssistFeature, TestType } from '@aba/database';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { TestPageRepository } from '@/modules/test-page/repositories/testPage.repository';
import { TestDefinitionRepository } from '@/modules/test-definition/repositories/testDefinition.repository';
import { TestRunRepository } from '@/modules/test-run/repositories/testRun.repository';
import {
  TestAssertionsSchema,
  TestConfigSchema,
} from '@/modules/test-definition/dtos/CreateTestDefinitionDto';
import { AnthropicClientService } from '@/modules/ai-assist/services/anthropicClient.service';
import { AiMeteringService } from '@/modules/ai-assist/services/aiMetering.service';
import { AiUsageRepository } from '@/modules/ai-assist/repositories/aiUsage.repository';
import { FEATURE_MODELS } from '@/modules/ai-assist/config/aiPricing';
import {
  buildExplainPrompt,
  buildImprovePrompt,
  buildSuggestPrompt,
  extractJson,
  SuggestPageContext,
} from '@/modules/ai-assist/prompts/prompts';
import { AiAssistStatus } from '@/modules/ai-assist/types/aiStatus';
import {
  ExplainRunResult,
  ImproveTestResult,
  SuggestTestsResult,
  TestSuggestion,
} from '@/modules/ai-assist/types/aiResults';

@Injectable()
export class AiAssistService {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly testPageRepository: TestPageRepository,
    private readonly testDefinitionRepository: TestDefinitionRepository,
    private readonly testRunRepository: TestRunRepository,
    private readonly anthropic: AnthropicClientService,
    private readonly metering: AiMeteringService,
    private readonly aiUsageRepository: AiUsageRepository,
  ) {}

  getStatus(companyId: number): Promise<AiAssistStatus> {
    return this.metering.getStatus(companyId);
  }

  private async resolveService(
    companyId: number,
    environmentId: number,
    serviceId: number,
  ) {
    const environment =
      await this.environmentRepository.findById(environmentId);
    if (!environment || environment.companyId !== companyId) return null;
    const service = await this.serviceRepository.findById(serviceId);
    if (!service || service.environmentId !== environmentId) return null;
    return service;
  }

  /** Validate a model-produced config against our own schema; drop if invalid. */
  private safeConfig(value: unknown): Record<string, unknown> | null {
    if (value == null || typeof value !== 'object') return null;
    const parsed = TestConfigSchema.safeParse(value);
    return parsed.success
      ? (parsed.data as Record<string, unknown>)
      : null;
  }

  private safeAssertions(value: unknown): Record<string, unknown> | null {
    if (value == null || typeof value !== 'object') return null;
    const parsed = TestAssertionsSchema.safeParse(value);
    return parsed.success
      ? (parsed.data as Record<string, unknown>)
      : null;
  }

  private toTestType(value: unknown): TestType {
    return value === TestType.GLOBAL_SECURITY || value === TestType.BROWSER
      ? (value as TestType)
      : TestType.CUSTOM_API;
  }

  private pageContext(
    page: {
      name: string;
      pageType: string;
      method: string | null;
      path: string | null;
      absoluteUrl: string | null;
      authKind: string;
      accessConfig: unknown;
    },
    existingTestNames: string[],
  ): SuggestPageContext {
    return {
      name: page.name,
      pageType: page.pageType,
      method: page.method,
      pathOrUrl: page.absoluteUrl ?? page.path,
      authKind: page.authKind,
      accessConfig: page.accessConfig ?? null,
      existingTestNames,
    };
  }

  async suggestTests(
    companyId: number,
    environmentId: number,
    serviceId: number,
    pageId: number,
    userId: number | null,
    count: number,
    instructions?: string,
  ): Promise<Result<SuggestTestsResult, Error>> {
    const service = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!service) return err(new NotFoundException('Service not found.'));
    const page = await this.testPageRepository.findById(pageId);
    if (!page || (page as any).serviceId !== serviceId) {
      return err(new NotFoundException('Test page not found.'));
    }

    const existing =
      await this.testDefinitionRepository.findAllForTarget(pageId);
    const ctx = this.pageContext(
      page as any,
      existing.map((d) => d.name),
    );
    const { system, user } = buildSuggestPrompt(ctx, count, instructions);
    const cfg = FEATURE_MODELS[AiAssistFeature.SUGGEST_TESTS];

    const estimate =
      this.metering.estimatePromptTokens(system, user) + cfg.maxOutputTokens;
    await this.metering.reserve(companyId, estimate);

    const completion = await this.anthropic.complete({
      model: cfg.model,
      system,
      user,
      maxTokens: cfg.maxOutputTokens,
      effort: 'low',
    });
    await this.metering.settle(
      companyId,
      AiAssistFeature.SUGGEST_TESTS,
      cfg.model,
      completion.inputTokens,
      completion.outputTokens,
      userId,
    );

    const parsed = extractJson<{ suggestions?: unknown[] }>(completion.text);
    const raw = Array.isArray(parsed?.suggestions) ? parsed!.suggestions : [];
    const suggestions: TestSuggestion[] = raw
      .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === 'object')
      .map((s) => ({
        title: String(s.title ?? 'Suggested test'),
        summary: String(s.summary ?? ''),
        detail: String(s.detail ?? ''),
        type: this.toTestType(s.type),
        config: this.safeConfig(s.config),
        assertions: this.safeAssertions(s.assertions),
      }));

    const status = await this.metering.getStatus(companyId);
    return ok({
      suggestions,
      usage: {
        model: cfg.model,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        remaining: status.remaining,
      },
    });
  }

  async explainRun(
    companyId: number,
    environmentId: number,
    serviceId: number,
    runId: number,
    userId: number | null,
  ): Promise<Result<ExplainRunResult, Error>> {
    const service = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!service) return err(new NotFoundException('Service not found.'));
    const run = await this.testRunRepository.findByIdWithResults(runId);
    if (!run || (run as any).serviceId !== serviceId) {
      return err(new NotFoundException('Test run not found.'));
    }

    const results = ((run as any).results ?? []).map((r: any) => ({
      name: r.name,
      status: r.status,
      request: r.request,
      response: r.response,
      assertionResults: r.assertionResults,
      errorMessage: r.errorMessage,
    }));
    const { system, user } = buildExplainPrompt(
      {
        status: (run as any).status,
        trigger: (run as any).trigger,
        totalCount: (run as any).totalCount,
        passedCount: (run as any).passedCount,
        failedCount: (run as any).failedCount,
        errorCount: (run as any).errorCount,
      },
      results,
    );
    const cfg = FEATURE_MODELS[AiAssistFeature.EXPLAIN_RUN];

    const estimate =
      this.metering.estimatePromptTokens(system, user) + cfg.maxOutputTokens;
    await this.metering.reserve(companyId, estimate);

    const completion = await this.anthropic.complete({
      model: cfg.model,
      system,
      user,
      maxTokens: cfg.maxOutputTokens,
      effort: 'low',
    });
    await this.metering.settle(
      companyId,
      AiAssistFeature.EXPLAIN_RUN,
      cfg.model,
      completion.inputTokens,
      completion.outputTokens,
      userId,
    );

    const parsed = extractJson<{
      summary?: string;
      perTest?: { name?: string; verdict?: string; explanation?: string }[];
      recommendations?: string[];
    }>(completion.text);

    const status = await this.metering.getStatus(companyId);
    return ok({
      summary: String(parsed?.summary ?? completion.text.slice(0, 2000)),
      perTest: Array.isArray(parsed?.perTest)
        ? parsed!.perTest.map((p) => ({
            name: String(p?.name ?? ''),
            verdict: String(p?.verdict ?? 'info'),
            explanation: String(p?.explanation ?? ''),
          }))
        : [],
      recommendations: Array.isArray(parsed?.recommendations)
        ? parsed!.recommendations.map((r) => String(r))
        : [],
      usage: {
        model: cfg.model,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        remaining: status.remaining,
      },
    });
  }

  async improveTest(
    companyId: number,
    environmentId: number,
    serviceId: number,
    pageId: number,
    definitionId: number,
    userId: number | null,
    instructions?: string,
  ): Promise<Result<ImproveTestResult, Error>> {
    const service = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!service) return err(new NotFoundException('Service not found.'));
    const page = await this.testPageRepository.findById(pageId);
    if (!page || (page as any).serviceId !== serviceId) {
      return err(new NotFoundException('Test page not found.'));
    }
    const def = await this.testDefinitionRepository.findById(definitionId);
    if (!def || def.testPageId !== pageId) {
      return err(new NotFoundException('Test definition not found.'));
    }

    const ctx = this.pageContext(page as any, []);
    const { system, user } = buildImprovePrompt(
      ctx,
      {
        name: def.name,
        type: def.type,
        config: def.config,
        assertions: def.assertions,
      },
      instructions,
    );
    const cfg = FEATURE_MODELS[AiAssistFeature.IMPROVE_TEST];

    const estimate =
      this.metering.estimatePromptTokens(system, user) + cfg.maxOutputTokens;
    await this.metering.reserve(companyId, estimate);

    const completion = await this.anthropic.complete({
      model: cfg.model,
      system,
      user,
      maxTokens: cfg.maxOutputTokens,
      effort: 'low',
    });
    await this.metering.settle(
      companyId,
      AiAssistFeature.IMPROVE_TEST,
      cfg.model,
      completion.inputTokens,
      completion.outputTokens,
      userId,
    );

    const parsed = extractJson<{
      rationale?: string;
      improved?: { name?: string; config?: unknown; assertions?: unknown };
    }>(completion.text);

    const status = await this.metering.getStatus(companyId);
    return ok({
      rationale: String(parsed?.rationale ?? ''),
      improved: {
        name: parsed?.improved?.name ? String(parsed.improved.name) : null,
        config: this.safeConfig(parsed?.improved?.config),
        assertions: this.safeAssertions(parsed?.improved?.assertions),
      },
      usage: {
        model: cfg.model,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        remaining: status.remaining,
      },
    });
  }

  async grantTokens(
    companyId: number,
    tokens: number,
    pricePaidUsd: number,
    note: string | null,
  ): Promise<AiAssistStatus> {
    await this.aiUsageRepository.createPurchase({
      companyId,
      tokens,
      pricePaidUsd,
      note,
    });
    return this.metering.getStatus(companyId);
  }
}

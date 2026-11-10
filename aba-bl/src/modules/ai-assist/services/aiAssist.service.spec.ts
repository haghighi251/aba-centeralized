import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AiAssistFeature, TestType } from '@aba/database';
import { AiAssistService } from './aiAssist.service';
import { AiMeteringService } from './aiMetering.service';
import { AnthropicClientService } from './anthropicClient.service';
import { AiUsageRepository } from '@/modules/ai-assist/repositories/aiUsage.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { TestPageRepository } from '@/modules/test-page/repositories/testPage.repository';
import { TestDefinitionRepository } from '@/modules/test-definition/repositories/testDefinition.repository';
import { TestRunRepository } from '@/modules/test-run/repositories/testRun.repository';

describe('AiAssistService', () => {
  let service: AiAssistService;
  let environmentRepository: { findById: jest.Mock };
  let serviceRepository: { findById: jest.Mock };
  let testPageRepository: { findById: jest.Mock };
  let testDefinitionRepository: { findById: jest.Mock; findAllForTarget: jest.Mock };
  let testRunRepository: { findByIdWithResults: jest.Mock };
  let anthropic: { complete: jest.Mock };
  let metering: {
    reserve: jest.Mock;
    settle: jest.Mock;
    estimatePromptTokens: jest.Mock;
    getStatus: jest.Mock;
  };
  let aiUsageRepository: { createPurchase: jest.Mock };

  const COMPANY = 1;
  const ENV = 1;
  const SERVICE = 1;
  const PAGE = 1;

  const page = {
    id: PAGE,
    serviceId: SERVICE,
    name: 'Login',
    pageType: 'LOGIN',
    method: 'POST',
    path: '/login',
    absoluteUrl: null,
    authKind: 'BEARER_TOKEN',
    accessConfig: null,
  };

  beforeEach(async () => {
    environmentRepository = {
      findById: jest.fn().mockResolvedValue({ id: ENV, companyId: COMPANY }),
    };
    serviceRepository = {
      findById: jest.fn().mockResolvedValue({ id: SERVICE, environmentId: ENV }),
    };
    testPageRepository = { findById: jest.fn().mockResolvedValue(page) };
    testDefinitionRepository = {
      findById: jest.fn(),
      findAllForTarget: jest.fn().mockResolvedValue([]),
    };
    testRunRepository = { findByIdWithResults: jest.fn() };
    anthropic = { complete: jest.fn() };
    metering = {
      reserve: jest.fn().mockResolvedValue(undefined),
      settle: jest.fn().mockResolvedValue(undefined),
      estimatePromptTokens: jest.fn().mockReturnValue(10),
      getStatus: jest.fn().mockResolvedValue({ remaining: 999 }),
    };
    aiUsageRepository = { createPurchase: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAssistService,
        { provide: EnvironmentRepository, useValue: environmentRepository },
        { provide: ServiceRepository, useValue: serviceRepository },
        { provide: TestPageRepository, useValue: testPageRepository },
        { provide: TestDefinitionRepository, useValue: testDefinitionRepository },
        { provide: TestRunRepository, useValue: testRunRepository },
        { provide: AnthropicClientService, useValue: anthropic },
        { provide: AiMeteringService, useValue: metering },
        { provide: AiUsageRepository, useValue: aiUsageRepository },
      ],
    }).compile();
    service = module.get(AiAssistService);
  });

  describe('suggestTests', () => {
    it('errors when the service does not belong to the environment', async () => {
      serviceRepository.findById.mockResolvedValue({ id: SERVICE, environmentId: 999 });
      const r = await service.suggestTests(COMPANY, ENV, SERVICE, PAGE, null, 3);
      expect(r.isErr()).toBe(true);
      if (r.isErr()) expect(r.error).toBeInstanceOf(NotFoundException);
      expect(metering.reserve).not.toHaveBeenCalled();
    });

    it('errors when the page is not on the service', async () => {
      testPageRepository.findById.mockResolvedValue({ ...page, serviceId: 999 });
      const r = await service.suggestTests(COMPANY, ENV, SERVICE, PAGE, null, 3);
      expect(r.isErr()).toBe(true);
    });

    it('reserves, calls Haiku, settles, and returns schema-validated suggestions', async () => {
      anthropic.complete.mockResolvedValue({
        text: JSON.stringify({
          suggestions: [
            {
              title: 'Valid',
              summary: 's',
              detail: 'd',
              type: 'CUSTOM_API',
              config: { method: 'GET' },
              assertions: { status: 200 },
            },
            {
              title: 'Invalid bits',
              type: 'WEIRD_TYPE',
              config: { foo: 'bar' }, // strict schema -> dropped
              assertions: { status: 'bad' }, // invalid -> dropped
            },
          ],
        }),
        inputTokens: 50,
        outputTokens: 80,
        stopReason: 'end_turn',
      });

      const r = await service.suggestTests(COMPANY, ENV, SERVICE, PAGE, 7, 2, 'hint');
      expect(r.isOk()).toBe(true);
      if (!r.isOk()) return;

      expect(metering.reserve).toHaveBeenCalledTimes(1);
      expect(anthropic.complete).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-haiku-5-5' }),
      );
      expect(metering.settle).toHaveBeenCalledWith(
        COMPANY,
        AiAssistFeature.SUGGEST_TESTS,
        'claude-haiku-5-5',
        50,
        80,
        7,
      );

      const { suggestions, usage } = r.value;
      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toMatchObject({
        title: 'Valid',
        type: TestType.CUSTOM_API,
        config: { method: 'GET' },
        assertions: { status: 200 },
      });
      // invalid type coerced to CUSTOM_API, invalid config/assertions dropped
      expect(suggestions[1].type).toBe(TestType.CUSTOM_API);
      expect(suggestions[1].config).toBeNull();
      expect(suggestions[1].assertions).toBeNull();
      expect(usage.remaining).toBe(999);
    });

    it('returns an empty list when the model reply has no suggestions', async () => {
      anthropic.complete.mockResolvedValue({
        text: 'sorry, no JSON',
        inputTokens: 5,
        outputTokens: 5,
        stopReason: 'end_turn',
      });
      const r = await service.suggestTests(COMPANY, ENV, SERVICE, PAGE, null, 3);
      expect(r.isOk()).toBe(true);
      if (r.isOk()) expect(r.value.suggestions).toEqual([]);
      // still settled (tokens were spent)
      expect(metering.settle).toHaveBeenCalled();
    });
  });

  describe('explainRun', () => {
    it('errors when the run is not on the service', async () => {
      testRunRepository.findByIdWithResults.mockResolvedValue({ serviceId: 999 });
      const r = await service.explainRun(COMPANY, ENV, SERVICE, 5, null);
      expect(r.isErr()).toBe(true);
    });

    it('returns a parsed explanation and uses the Opus model', async () => {
      testRunRepository.findByIdWithResults.mockResolvedValue({
        serviceId: SERVICE,
        status: 'FAILED',
        trigger: 'MANUAL',
        totalCount: 1,
        passedCount: 0,
        failedCount: 1,
        errorCount: 0,
        results: [
          {
            name: 't',
            status: 'FAILED',
            request: {},
            response: {},
            assertionResults: [],
            errorMessage: null,
          },
        ],
      });
      anthropic.complete.mockResolvedValue({
        text: JSON.stringify({
          summary: 'It failed',
          perTest: [{ name: 't', verdict: 'fail', explanation: 'why' }],
          recommendations: ['fix it'],
        }),
        inputTokens: 100,
        outputTokens: 200,
        stopReason: 'end_turn',
      });

      const r = await service.explainRun(COMPANY, ENV, SERVICE, 5, 9);
      expect(r.isOk()).toBe(true);
      if (!r.isOk()) return;
      expect(anthropic.complete).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-opus-5-5' }),
      );
      expect(r.value.summary).toBe('It failed');
      expect(r.value.perTest).toEqual([
        { name: 't', verdict: 'fail', explanation: 'why' },
      ]);
      expect(r.value.recommendations).toEqual(['fix it']);
      expect(metering.settle).toHaveBeenCalledWith(
        COMPANY,
        AiAssistFeature.EXPLAIN_RUN,
        'claude-opus-5-5',
        100,
        200,
        9,
      );
    });
  });

  describe('improveTest', () => {
    it('errors when the definition is not on the page', async () => {
      testDefinitionRepository.findById.mockResolvedValue({
        id: 2,
        testPageId: 999,
      });
      const r = await service.improveTest(COMPANY, ENV, SERVICE, PAGE, 2, null);
      expect(r.isErr()).toBe(true);
    });

    it('returns a validated improved test', async () => {
      testDefinitionRepository.findById.mockResolvedValue({
        id: 2,
        testPageId: PAGE,
        name: 'Old',
        type: 'CUSTOM_API',
        config: { method: 'GET' },
        assertions: {},
      });
      anthropic.complete.mockResolvedValue({
        text: JSON.stringify({
          rationale: 'stronger now',
          improved: {
            name: 'New',
            config: { method: 'POST' },
            assertions: { status: [401, 403] },
          },
        }),
        inputTokens: 30,
        outputTokens: 40,
        stopReason: 'end_turn',
      });

      const r = await service.improveTest(COMPANY, ENV, SERVICE, PAGE, 2, 5, 'harder');
      expect(r.isOk()).toBe(true);
      if (!r.isOk()) return;
      expect(r.value.rationale).toBe('stronger now');
      expect(r.value.improved.name).toBe('New');
      expect(r.value.improved.config).toEqual({ method: 'POST' });
      expect(r.value.improved.assertions).toEqual({ status: [401, 403] });
    });
  });

  describe('grantTokens', () => {
    it('records a purchase and returns the refreshed status', async () => {
      metering.getStatus.mockResolvedValue({ remaining: 1234 });
      const status = await service.grantTokens(COMPANY, 1000, 9.99, 'note');
      expect(aiUsageRepository.createPurchase).toHaveBeenCalledWith({
        companyId: COMPANY,
        tokens: 1000,
        pricePaidUsd: 9.99,
        note: 'note',
      });
      expect(status).toEqual({ remaining: 1234 });
    });
  });
});

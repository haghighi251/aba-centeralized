import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { AiAssistFeature } from '@aba/database';
import { AiMeteringService } from './aiMetering.service';
import { AnthropicClientService } from './anthropicClient.service';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { AiUsageRepository } from '@/modules/ai-assist/repositories/aiUsage.repository';

describe('AiMeteringService', () => {
  let service: AiMeteringService;
  let companyRepository: { findById: jest.Mock };
  let aiUsageRepository: {
    sumConsumedTokensSince: jest.Mock;
    sumPurchasedTokensSince: jest.Mock;
    createUsageLog: jest.Mock;
  };
  let anthropic: { isConfigured: jest.Mock };

  const withPlan = (allowance: number | null) => ({
    id: 1,
    subscriptionPlan: { aiMonthlyTokenAllowance: allowance },
  });

  beforeEach(async () => {
    companyRepository = { findById: jest.fn() };
    aiUsageRepository = {
      sumConsumedTokensSince: jest.fn().mockResolvedValue(0),
      sumPurchasedTokensSince: jest.fn().mockResolvedValue(0),
      createUsageLog: jest.fn().mockResolvedValue({}),
    };
    anthropic = { isConfigured: jest.fn().mockReturnValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiMeteringService,
        { provide: CompanyRepository, useValue: companyRepository },
        { provide: AiUsageRepository, useValue: aiUsageRepository },
        { provide: AnthropicClientService, useValue: anthropic },
      ],
    }).compile();
    service = module.get(AiMeteringService);
  });

  describe('estimatePromptTokens', () => {
    it('estimates ~1 token per 4 chars', () => {
      expect(service.estimatePromptTokens('aaaa', 'bbbb')).toBe(2); // 8/4
      expect(service.estimatePromptTokens('abc', '')).toBe(1); // ceil(3/4)
    });
  });

  describe('getStatus', () => {
    it('reports disabled + not offered when the plan has no allowance', async () => {
      companyRepository.findById.mockResolvedValue(withPlan(null));
      const s = await service.getStatus(1);
      expect(s.offered).toBe(false);
      expect(s.enabled).toBe(false);
      expect(s.monthlyAllowance).toBe(0);
    });

    it('is offered + enabled when allowance > 0 and key configured', async () => {
      companyRepository.findById.mockResolvedValue(withPlan(100000));
      aiUsageRepository.sumConsumedTokensSince.mockResolvedValue(30000);
      aiUsageRepository.sumPurchasedTokensSince.mockResolvedValue(5000);
      const s = await service.getStatus(1);
      expect(s.offered).toBe(true);
      expect(s.apiKeyConfigured).toBe(true);
      expect(s.enabled).toBe(true);
      // remaining = 100000 + 5000 - 30000
      expect(s.remaining).toBe(75000);
    });

    it('is offered but not enabled when the API key is missing', async () => {
      companyRepository.findById.mockResolvedValue(withPlan(100000));
      anthropic.isConfigured.mockReturnValue(false);
      const s = await service.getStatus(1);
      expect(s.offered).toBe(true);
      expect(s.enabled).toBe(false);
    });

    it('clamps remaining to zero when over-consumed', async () => {
      companyRepository.findById.mockResolvedValue(withPlan(1000));
      aiUsageRepository.sumConsumedTokensSince.mockResolvedValue(5000);
      const s = await service.getStatus(1);
      expect(s.remaining).toBe(0);
    });

    it('handles a company with no plan', async () => {
      companyRepository.findById.mockResolvedValue({ id: 1 });
      const s = await service.getStatus(1);
      expect(s.offered).toBe(false);
      expect(s.monthlyAllowance).toBe(0);
    });
  });

  describe('reserve', () => {
    it('throws Forbidden when AI is not offered on the plan', async () => {
      companyRepository.findById.mockResolvedValue(withPlan(0));
      await expect(service.reserve(1, 100)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws Forbidden when the API key is not configured', async () => {
      companyRepository.findById.mockResolvedValue(withPlan(100000));
      anthropic.isConfigured.mockReturnValue(false);
      await expect(service.reserve(1, 100)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws 402 when remaining cannot cover the reservation', async () => {
      companyRepository.findById.mockResolvedValue(withPlan(1000));
      aiUsageRepository.sumConsumedTokensSince.mockResolvedValue(900);
      // remaining = 100, estimate 500 -> exhausted
      expect.assertions(2);
      try {
        await service.reserve(1, 500);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    });

    it('resolves when the remaining allowance covers the reservation', async () => {
      companyRepository.findById.mockResolvedValue(withPlan(100000));
      await expect(service.reserve(1, 5000)).resolves.toBeUndefined();
    });
  });

  describe('settle', () => {
    it('writes a usage log with the computed cost', async () => {
      await service.settle(
        1,
        AiAssistFeature.SUGGEST_TESTS,
        'claude-haiku-5-5',
        1000,
        1000,
        7,
      );
      expect(aiUsageRepository.createUsageLog).toHaveBeenCalledWith({
        companyId: 1,
        feature: AiAssistFeature.SUGGEST_TESTS,
        model: 'claude-haiku-5-5',
        inputTokens: 1000,
        outputTokens: 1000,
        costMicroUsd: 600,
        userId: 7,
      });
    });
  });
});

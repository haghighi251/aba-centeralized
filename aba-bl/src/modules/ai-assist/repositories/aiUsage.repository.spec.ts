import { Test, TestingModule } from '@nestjs/testing';
import { AiAssistFeature } from '@aba/database';
import { AiUsageRepository } from './aiUsage.repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';

describe('AiUsageRepository', () => {
  let repo: AiUsageRepository;
  let prisma: {
    aiUsageLog: { aggregate: jest.Mock; create: jest.Mock };
    aiTokenPurchase: { aggregate: jest.Mock; create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      aiUsageLog: { aggregate: jest.fn(), create: jest.fn() },
      aiTokenPurchase: { aggregate: jest.fn(), create: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiUsageRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    repo = module.get(AiUsageRepository);
  });

  describe('sumConsumedTokensSince', () => {
    it('adds input and output token sums', async () => {
      prisma.aiUsageLog.aggregate.mockResolvedValue({
        _sum: { inputTokens: 300, outputTokens: 120 },
      });
      const total = await repo.sumConsumedTokensSince(1, new Date('2026-11-01'));
      expect(total).toBe(420);
      expect(prisma.aiUsageLog.aggregate).toHaveBeenCalledWith({
        where: { companyId: 1, createdAt: { gte: new Date('2026-11-01') } },
        _sum: { inputTokens: true, outputTokens: true },
      });
    });

    it('treats null sums as zero', async () => {
      prisma.aiUsageLog.aggregate.mockResolvedValue({
        _sum: { inputTokens: null, outputTokens: null },
      });
      expect(await repo.sumConsumedTokensSince(1, new Date())).toBe(0);
    });
  });

  describe('sumPurchasedTokensSince', () => {
    it('returns the purchased token sum', async () => {
      prisma.aiTokenPurchase.aggregate.mockResolvedValue({
        _sum: { tokens: 5000 },
      });
      expect(await repo.sumPurchasedTokensSince(2, new Date())).toBe(5000);
    });

    it('treats a null sum as zero', async () => {
      prisma.aiTokenPurchase.aggregate.mockResolvedValue({ _sum: { tokens: null } });
      expect(await repo.sumPurchasedTokensSince(2, new Date())).toBe(0);
    });
  });

  it('createUsageLog delegates to prisma', async () => {
    const row = { id: 1 };
    prisma.aiUsageLog.create.mockResolvedValue(row);
    const data = {
      companyId: 1,
      feature: AiAssistFeature.SUGGEST_TESTS,
      model: 'claude-haiku-5-5',
      inputTokens: 10,
      outputTokens: 20,
      costMicroUsd: 5,
      userId: 7,
    };
    const result = await repo.createUsageLog(data);
    expect(result).toBe(row);
    expect(prisma.aiUsageLog.create).toHaveBeenCalledWith({ data });
  });

  it('createPurchase delegates to prisma', async () => {
    const row = { id: 2 };
    prisma.aiTokenPurchase.create.mockResolvedValue(row);
    const data = { companyId: 1, tokens: 1000, pricePaidUsd: 9.99, note: 'x' };
    const result = await repo.createPurchase(data);
    expect(result).toBe(row);
    expect(prisma.aiTokenPurchase.create).toHaveBeenCalledWith({ data });
  });
});

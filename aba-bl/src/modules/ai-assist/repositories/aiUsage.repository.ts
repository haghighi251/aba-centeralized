import { Injectable } from '@nestjs/common';
import { AiAssistFeature, AiTokenPurchase, AiUsageLog } from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';

@Injectable()
export class AiUsageRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Sum of input+output tokens consumed by a company since `since`. */
  async sumConsumedTokensSince(
    companyId: number,
    since: Date,
  ): Promise<number> {
    const agg = await this.prisma.aiUsageLog.aggregate({
      where: { companyId, createdAt: { gte: since } },
      _sum: { inputTokens: true, outputTokens: true },
    });
    return (agg._sum.inputTokens ?? 0) + (agg._sum.outputTokens ?? 0);
  }

  /** Sum of top-up tokens granted to a company since `since`. */
  async sumPurchasedTokensSince(
    companyId: number,
    since: Date,
  ): Promise<number> {
    const agg = await this.prisma.aiTokenPurchase.aggregate({
      where: { companyId, createdAt: { gte: since } },
      _sum: { tokens: true },
    });
    return agg._sum.tokens ?? 0;
  }

  async createUsageLog(data: {
    companyId: number;
    feature: AiAssistFeature;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costMicroUsd: number;
    userId: number | null;
  }): Promise<AiUsageLog> {
    return this.prisma.aiUsageLog.create({ data });
  }

  async createPurchase(data: {
    companyId: number;
    tokens: number;
    pricePaidUsd: number;
    note: string | null;
  }): Promise<AiTokenPurchase> {
    return this.prisma.aiTokenPurchase.create({ data });
  }
}

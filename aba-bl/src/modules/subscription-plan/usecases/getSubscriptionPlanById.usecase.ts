import { UseCase } from '@/modules/shared/types/useCase';
import { Injectable } from '@nestjs/common';
import { SubscriptionPlan } from '@aba/database';
import { SubscriptionPlanService } from '@/modules/subscription-plan/services/subscriptionPlan.service';

@Injectable()
export class GetSubscriptionPlanByIdUseCase implements UseCase<
  number,
  SubscriptionPlan
> {
  constructor(private readonly planService: SubscriptionPlanService) {}

  async execute(id: number): Promise<SubscriptionPlan> {
    const result = await this.planService.getPlanById(id);
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

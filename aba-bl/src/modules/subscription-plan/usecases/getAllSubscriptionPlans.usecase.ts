import { UseCase } from '@/modules/shared/types/useCase';
import { Injectable } from '@nestjs/common';
import { SubscriptionPlan } from '@aba/database';
import { SubscriptionPlanService } from '@/modules/subscription-plan/services/subscriptionPlan.service';

@Injectable()
export class GetAllSubscriptionPlansUseCase implements UseCase<
  { adminView?: boolean },
  SubscriptionPlan[]
> {
  constructor(private readonly planService: SubscriptionPlanService) {}

  async execute(args?: { adminView?: boolean }): Promise<SubscriptionPlan[]> {
    const result = args?.adminView
      ? await this.planService.getAllPlansAdmin()
      : await this.planService.getAllPlans();
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

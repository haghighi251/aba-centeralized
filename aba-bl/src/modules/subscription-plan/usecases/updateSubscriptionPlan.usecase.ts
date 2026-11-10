import { UseCase } from '@/modules/shared/types/useCase';
import { Injectable } from '@nestjs/common';
import { SubscriptionPlan } from '@aba/database';
import { SubscriptionPlanService } from '@/modules/subscription-plan/services/subscriptionPlan.service';
import { UpdateSubscriptionPlanDto } from '@/modules/subscription-plan/dtos/subscriptionPlan.dto';

@Injectable()
export class UpdateSubscriptionPlanUseCase implements UseCase<
  { id: number; dto: UpdateSubscriptionPlanDto },
  SubscriptionPlan
> {
  constructor(private readonly planService: SubscriptionPlanService) {}

  async execute(args: {
    id: number;
    dto: UpdateSubscriptionPlanDto;
  }): Promise<SubscriptionPlan> {
    const result = await this.planService.updatePlan(args.id, args.dto);
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

import { UseCase } from '@/modules/shared/types/useCase';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SubscriptionPlan } from '@aba/database';
import { SubscriptionPlanService } from '@/modules/subscription-plan/services/subscriptionPlan.service';
import { CreateSubscriptionPlanDto } from '@/modules/subscription-plan/dtos/subscriptionPlan.dto';

@Injectable()
export class CreateSubscriptionPlanUseCase implements UseCase<
  CreateSubscriptionPlanDto,
  SubscriptionPlan
> {
  constructor(private readonly planService: SubscriptionPlanService) {}

  async execute(dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const result = await this.planService.createPlan(dto);
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

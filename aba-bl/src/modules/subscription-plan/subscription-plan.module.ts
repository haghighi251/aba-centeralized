import { Module } from '@nestjs/common';
import { SubscriptionPlanController } from '@/modules/subscription-plan/controllers/subscriptionPlan.controller';
import { SubscriptionPlanRepository } from '@/modules/subscription-plan/repositories/subscriptionPlan.repository';
import { SubscriptionPlanService } from '@/modules/subscription-plan/services/subscriptionPlan.service';
import { CreateSubscriptionPlanUseCase } from '@/modules/subscription-plan/usecases/createSubscriptionPlan.usecase';
import { GetAllSubscriptionPlansUseCase } from '@/modules/subscription-plan/usecases/getAllSubscriptionPlans.usecase';
import { GetSubscriptionPlanByIdUseCase } from '@/modules/subscription-plan/usecases/getSubscriptionPlanById.usecase';
import { UpdateSubscriptionPlanUseCase } from '@/modules/subscription-plan/usecases/updateSubscriptionPlan.usecase';
import { DeleteSubscriptionPlanUseCase } from '@/modules/subscription-plan/usecases/deleteSubscriptionPlan.usecase';

@Module({
  controllers: [SubscriptionPlanController],
  providers: [
    SubscriptionPlanRepository,
    SubscriptionPlanService,
    CreateSubscriptionPlanUseCase,
    GetAllSubscriptionPlansUseCase,
    GetSubscriptionPlanByIdUseCase,
    UpdateSubscriptionPlanUseCase,
    DeleteSubscriptionPlanUseCase,
  ],
  exports: [SubscriptionPlanRepository, SubscriptionPlanService],
})
export class SubscriptionPlanModule {}

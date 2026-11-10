import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import { SubscriptionPlan } from '@aba/database';
import { SubscriptionPlanRepository } from '@/modules/subscription-plan/repositories/subscriptionPlan.repository';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
} from '@/modules/subscription-plan/dtos/subscriptionPlan.dto';

@Injectable()
export class SubscriptionPlanService {
  constructor(private readonly planRepository: SubscriptionPlanRepository) {}

  async createPlan(
    dto: CreateSubscriptionPlanDto,
  ): Promise<Result<SubscriptionPlan, Error>> {
    const existing = await this.planRepository.findBySlug(dto.slug);
    if (existing) {
      return err(
        new ConflictException(
          `A subscription plan with slug "${dto.slug}" already exists.`,
        ),
      );
    }

    const plan = await this.planRepository.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description ?? null,
      maxServices: dto.maxServices ?? null,
      maxEnvironments: dto.maxEnvironments ?? null,
      maxMonitoredBranches: dto.maxMonitoredBranches ?? null,
      monthlyPrice: dto.monthlyPrice,
      yearlyPrice: dto.yearlyPrice,
      isActive: dto.isActive ?? true,
      isDefault: dto.isDefault ?? false,
      maxTestPages: dto.maxTestPages ?? null,
      maxTestDefinitions: dto.maxTestDefinitions ?? null,
      maxTestRunsPerMonth: dto.maxTestRunsPerMonth ?? null,
      allowScheduledTests: dto.allowScheduledTests ?? false,
      minTestScheduleIntervalHours: dto.minTestScheduleIntervalHours ?? null,
      allowWebhookTests: dto.allowWebhookTests ?? false,
      aiMonthlyTokenAllowance: dto.aiMonthlyTokenAllowance ?? null,
    });

    return ok(plan);
  }

  async getAllPlans(): Promise<Result<SubscriptionPlan[], Error>> {
    const { data } = await this.planRepository.findAll({ isActive: true });
    return ok(data);
  }

  async getAllPlansAdmin(): Promise<Result<SubscriptionPlan[], Error>> {
    const { data } = await this.planRepository.findAll({});
    return ok(data);
  }

  async getPlanById(id: number): Promise<Result<SubscriptionPlan, Error>> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      return err(new NotFoundException('Subscription plan not found.'));
    }
    return ok(plan);
  }

  async updatePlan(
    id: number,
    dto: UpdateSubscriptionPlanDto,
  ): Promise<Result<SubscriptionPlan, Error>> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      return err(new NotFoundException('Subscription plan not found.'));
    }

    if (dto.slug && dto.slug !== plan.slug) {
      const existing = await this.planRepository.findBySlug(dto.slug);
      if (existing) {
        return err(
          new ConflictException(
            `A subscription plan with slug "${dto.slug}" already exists.`,
          ),
        );
      }
    }

    const updated = await this.planRepository.update(id, dto);
    return ok(updated);
  }

  async deletePlan(id: number): Promise<Result<SubscriptionPlan, Error>> {
    const plan = await this.planRepository.findById(id);
    if (!plan) {
      return err(new NotFoundException('Subscription plan not found.'));
    }
    const deleted = await this.planRepository.delete(id);
    return ok(deleted);
  }

  async getDefaultPlan(): Promise<SubscriptionPlan | null> {
    return this.planRepository.findDefault();
  }
}

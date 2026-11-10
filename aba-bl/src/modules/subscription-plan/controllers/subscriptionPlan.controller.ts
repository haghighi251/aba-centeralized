import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SubscriptionPlan } from '@aba/database';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import { Roles } from '@/shared/nest/roles/roles.decorator';
import { RolesGuard } from '@/shared/nest/roles/roles.guard';
import { Role } from '@/shared/types/user.roles';
import { createResponse } from '@/shared/utils/createResponse';
import { ApiResponse as TApiResponse } from '@/shared/types/apiResponse';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';
import {
  CreateSubscriptionPlanSchema,
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanSchema,
  UpdateSubscriptionPlanDto,
} from '@/modules/subscription-plan/dtos/subscriptionPlan.dto';
import { CreateSubscriptionPlanUseCase } from '@/modules/subscription-plan/usecases/createSubscriptionPlan.usecase';
import { GetAllSubscriptionPlansUseCase } from '@/modules/subscription-plan/usecases/getAllSubscriptionPlans.usecase';
import { GetSubscriptionPlanByIdUseCase } from '@/modules/subscription-plan/usecases/getSubscriptionPlanById.usecase';
import { UpdateSubscriptionPlanUseCase } from '@/modules/subscription-plan/usecases/updateSubscriptionPlan.usecase';
import { DeleteSubscriptionPlanUseCase } from '@/modules/subscription-plan/usecases/deleteSubscriptionPlan.usecase';

const planSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string', nullable: true },
    maxServices: { type: 'number', nullable: true },
    maxEnvironments: { type: 'number', nullable: true },
    maxMonitoredBranches: { type: 'number', nullable: true },
    monthlyPrice: { type: 'number' },
    yearlyPrice: { type: 'number' },
    isActive: { type: 'boolean' },
    isDefault: { type: 'boolean' },
    maxTestPages: { type: 'number', nullable: true },
    maxTestDefinitions: { type: 'number', nullable: true },
    maxTestRunsPerMonth: { type: 'number', nullable: true },
    allowScheduledTests: { type: 'boolean' },
    minTestScheduleIntervalHours: { type: 'number', nullable: true },
    allowWebhookTests: { type: 'boolean' },
    aiMonthlyTokenAllowance: { type: 'number', nullable: true },
  },
};

@ApiTags('Subscription Plans')
@Controller('subscription-plans')
export class SubscriptionPlanController {
  constructor(
    private readonly createUseCase: CreateSubscriptionPlanUseCase,
    private readonly getAllUseCase: GetAllSubscriptionPlansUseCase,
    private readonly getByIdUseCase: GetSubscriptionPlanByIdUseCase,
    private readonly updateUseCase: UpdateSubscriptionPlanUseCase,
    private readonly deleteUseCase: DeleteSubscriptionPlanUseCase,
  ) {}

  @ApiOperation({ summary: 'List all active subscription plans (public)' })
  @ApiResponse({
    status: 200,
    description: 'List of active subscription plans.',
    schema: apiResponseSchema({ type: 'array', items: planSchema }),
  })
  @Get()
  async getAll(): Promise<TApiResponse<SubscriptionPlan[]>> {
    const plans = await this.getAllUseCase.execute();
    return createResponse(true, null, plans);
  }

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all subscription plans including inactive (admin)',
  })
  @ApiResponse({
    status: 200,
    schema: apiResponseSchema({ type: 'array', items: planSchema }),
  })
  @Get('admin/all')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async getAllAdmin(): Promise<TApiResponse<SubscriptionPlan[]>> {
    const plans = await this.getAllUseCase.execute({ adminView: true });
    return createResponse(true, null, plans);
  }

  @ApiOperation({ summary: 'Get a subscription plan by id (public)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, schema: apiResponseSchema(planSchema) })
  @ApiResponse({ status: 404, description: 'Plan not found.' })
  @Get(':id')
  async getById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TApiResponse<SubscriptionPlan>> {
    const plan = await this.getByIdUseCase.execute(id);
    return createResponse(true, null, plan);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a subscription plan (admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        slug: { type: 'string' },
        monthlyPrice: { type: 'number' },
        yearlyPrice: { type: 'number' },
        maxTestPages: { type: 'number', nullable: true },
        maxTestDefinitions: { type: 'number', nullable: true },
        maxTestRunsPerMonth: { type: 'number', nullable: true },
        allowScheduledTests: { type: 'boolean' },
        minTestScheduleIntervalHours: { type: 'number', nullable: true },
        allowWebhookTests: { type: 'boolean' },
        aiMonthlyTokenAllowance: {
          type: 'number',
          nullable: true,
          description:
            'Tokens/month of Claude AI assist included. null/0 = AI not offered.',
        },
      },
    },
  })
  @ApiResponse({ status: 201, schema: apiResponseSchema(planSchema) })
  @ApiResponse({
    status: 409,
    description: 'Plan with this slug already exists.',
  })
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @UsePipes(new ZodValidationPipe(CreateSubscriptionPlanSchema))
  async create(
    @Body() dto: CreateSubscriptionPlanDto,
  ): Promise<TApiResponse<SubscriptionPlan>> {
    const plan = await this.createUseCase.execute(dto);
    return createResponse(true, null, plan);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subscription plan (admin only)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, schema: apiResponseSchema(planSchema) })
  @ApiResponse({ status: 404, description: 'Plan not found.' })
  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateSubscriptionPlanSchema))
    dto: UpdateSubscriptionPlanDto,
  ): Promise<TApiResponse<SubscriptionPlan>> {
    const plan = await this.updateUseCase.execute({ id, dto });
    return createResponse(true, null, plan);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a subscription plan (admin only)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, schema: apiResponseSchema(planSchema) })
  @ApiResponse({ status: 404, description: 'Plan not found.' })
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<TApiResponse<SubscriptionPlan>> {
    const plan = await this.deleteUseCase.execute(id);
    return createResponse(true, null, plan);
  }
}

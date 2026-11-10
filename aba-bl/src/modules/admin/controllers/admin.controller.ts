import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse as ApiResponseDecorator,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { AdminGuard } from '@/modules/admin/guards/admin.guard';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { SubscriptionPlanRepository } from '@/modules/subscription-plan/repositories/subscriptionPlan.repository';
import {
  ActivityLogRepository,
  ActivityLogFilter,
} from '@/shared/repositories/activityLog.repository';
import { createResponse } from '@/shared/utils/createResponse';
import { ApiResponse } from '@/shared/types/apiResponse';
import { TCompanyFilter } from '@/modules/company/dtos/companyFilter';
import { ActivityEventType, ActivityLog, Company } from '@aba/database';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';

const ACTIVITY_EVENT_TYPES = [
  'NOTIFICATION_SENT',
  'NOTIFICATION_SKIPPED',
  'PACKAGE_VULN_VIEWED',
  'PACKAGE_UPDATED',
  'PACKAGE_MUTED',
  'PACKAGE_UNMUTED',
  'PACKAGE_SNOOZED',
  'PACKAGE_REMOVED',
];

const UpdateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'], {
    errorMap: () => ({
      message: 'status must be ACTIVE, INACTIVE, SUSPENDED or PENDING.',
    }),
  }),
});

const companySchema = { type: 'object' };

const AssignPlanSchema = z.object({
  planId: z.number().int().positive(),
  payAsYouGo: z.boolean().optional(),
});

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly subscriptionPlanRepository: SubscriptionPlanRepository,
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  /** List companies that have a BUSINESS_OWNER user, with KPI counts. */
  @ApiOperation({
    summary: 'List companies',
    description:
      'Returns paginated companies that have a BUSINESS_OWNER user, along with status ' +
      'KPI counts. Restricted to platform admins.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'],
  })
  @ApiResponseDecorator({
    status: 200,
    description: 'Paginated companies with KPI counts.',
    schema: apiResponseSchema({
      type: 'object',
      properties: {
        data: { type: 'array', items: companySchema },
        total: { type: 'number' },
        kpis: { type: 'object' },
      },
    }),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'User does not have an admin role.',
  })
  @HttpCode(HttpStatus.OK)
  @Get('companies')
  async getCompanies(@Query() query: TCompanyFilter) {
    const filter: TCompanyFilter = {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
      search: query.search,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'desc',
      status: query.status,
    };

    const [{ data, total }, kpis] = await Promise.all([
      this.companyRepository.findAllWithBusinessOwner(filter),
      this.companyRepository.getStatusSummary(),
    ]);

    return createResponse(true, null, { data, total, kpis });
  }

  /** Update a company's status. Only SUPER_ADMIN and ADMIN may call this. */
  @ApiOperation({
    summary: "Update a company's status",
    description:
      "Sets a company's status to ACTIVE, INACTIVE, SUSPENDED or PENDING. Restricted to platform admins.",
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'],
        },
      },
    },
  })
  @ApiResponseDecorator({
    status: 200,
    description: 'Company status updated.',
    schema: apiResponseSchema(companySchema),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'User does not have an admin role.',
  })
  @ApiResponseDecorator({ status: 404, description: 'Company not found.' })
  @HttpCode(HttpStatus.OK)
  @Patch('companies/:id/status')
  async updateCompanyStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<ApiResponse<Company>> {
    const parsed = UpdateStatusSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join(', ');
      throw new NotFoundException(msg); // re-use closest HTTP error; 400 is below via filter
    }

    const company = await this.companyRepository.exists(id);
    if (!company) throw new NotFoundException(`Company ${id} not found.`);

    const updated = await this.companyRepository.updateStatus(
      id,
      parsed.data.status,
    );
    return createResponse(true, null, updated);
  }

  /** Assign a subscription plan to a company. */
  @ApiOperation({
    summary: 'Assign a subscription plan to a company',
    description:
      "Sets the company's subscription plan. Optionally enables pay-as-you-go. Restricted to platform admins.",
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['planId'],
      properties: {
        planId: { type: 'number' },
        payAsYouGo: { type: 'boolean' },
      },
    },
  })
  @ApiResponseDecorator({
    status: 200,
    description: 'Plan assigned.',
    schema: apiResponseSchema(companySchema),
  })
  @ApiResponseDecorator({
    status: 404,
    description: 'Company or plan not found.',
  })
  @HttpCode(HttpStatus.OK)
  @Put('companies/:id/plan')
  async assignPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: unknown,
  ): Promise<ApiResponse<Company>> {
    const parsed = AssignPlanSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join(', ');
      throw new NotFoundException(msg);
    }

    const companyExists = await this.companyRepository.exists(id);
    if (!companyExists) throw new NotFoundException(`Company ${id} not found.`);

    const planExists = await this.subscriptionPlanRepository.exists(
      parsed.data.planId,
    );
    if (!planExists)
      throw new NotFoundException(
        `Subscription plan ${parsed.data.planId} not found.`,
      );

    const updated = await this.companyRepository.update(id, {
      subscriptionPlanId: parsed.data.planId,
      ...(parsed.data.payAsYouGo !== undefined && {
        payAsYouGo: parsed.data.payAsYouGo,
      }),
    } as any);
    return createResponse(true, null, updated);
  }

  /** Per-company vulnerability/notification summary for the admin dashboard. */
  @ApiOperation({
    summary: 'List companies with vulnerability/notification summaries',
    description:
      'Returns the same paginated company list as GET /admin/companies, plus per-company ' +
      'counts of outstanding vulnerable packages, affected services, and notifications ' +
      'ever sent — and whether a primary owner has been designated yet. Restricted to platform admins.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'],
  })
  @ApiResponseDecorator({
    status: 200,
    description: 'Paginated companies with vulnerability summaries.',
    schema: apiResponseSchema({
      type: 'object',
      properties: {
        data: { type: 'array', items: companySchema },
        total: { type: 'number' },
      },
    }),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'User does not have an admin role.',
  })
  @HttpCode(HttpStatus.OK)
  @Get('companies/vulnerability-summary')
  async getCompaniesWithVulnerabilities(@Query() query: TCompanyFilter) {
    const filter: TCompanyFilter = {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
      search: query.search,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'desc',
      status: query.status,
    };

    const { data, total } =
      await this.companyRepository.findCompaniesWithVulnerabilitySummary(
        filter,
      );

    return createResponse(true, null, { data, total });
  }

  /** Filterable activity/notification log browser for the admin dashboard. */
  @ApiOperation({
    summary: 'Browse the activity/notification audit log',
    description:
      'Returns a paginated feed of ActivityLog entries (notification sent/skipped, ' +
      'package viewed/updated/muted/unmuted/snoozed/removed), filterable by company, ' +
      'company+environment, service, event type, and/or time range. Restricted to platform admins.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @ApiQuery({ name: 'environmentId', required: false, type: Number })
  @ApiQuery({ name: 'serviceId', required: false, type: Number })
  @ApiQuery({ name: 'eventType', required: false, enum: ACTIVITY_EVENT_TYPES })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'ISO date, inclusive lower bound.',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'ISO date, inclusive upper bound.',
  })
  @ApiResponseDecorator({
    status: 200,
    description: 'Paginated activity log entries.',
    schema: apiResponseSchema({
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
      },
    }),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'User does not have an admin role.',
  })
  @HttpCode(HttpStatus.OK)
  @Get('activity-logs')
  async getActivityLogs(
    @Query() query: Record<string, string>,
  ): Promise<ApiResponse<{ data: ActivityLog[]; total: number }>> {
    const filter: ActivityLogFilter = {
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
      companyId: query.companyId ? Number(query.companyId) : undefined,
      environmentId: query.environmentId
        ? Number(query.environmentId)
        : undefined,
      serviceId: query.serviceId ? Number(query.serviceId) : undefined,
      eventType: query.eventType as ActivityEventType | undefined,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };

    const { data, total } = await this.activityLogRepository.findAll(filter);

    return createResponse(true, null, { data, total });
  }
}

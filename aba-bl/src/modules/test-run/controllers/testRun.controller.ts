import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse as ApiResponseDecorator,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { TestRun } from '@aba/database';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { CompanyAccessGuard } from '@/modules/company/guards/company-access.guard';
import { CompanyManagerGuard } from '@/modules/company/guards/company-manager.guard';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import { createResponse } from '@/shared/utils/createResponse';
import { ApiResponse } from '@/shared/types/apiResponse';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';
import {
  CreateTestRunDto,
  CreateTestRunDtoSchema,
} from '@/modules/test-run/dtos/CreateTestRunDto';
import { CreateTestRunUseCase } from '@/modules/test-run/usecases/createTestRun.usecase';
import { GetTestRunsUseCase } from '@/modules/test-run/usecases/getTestRuns.usecase';
import { GetTestRunByIdUseCase } from '@/modules/test-run/usecases/getTestRunById.usecase';

const RUN_STATUSES = ['QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'ERROR', 'CANCELLED'];

const testRunSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    runKey: { type: 'string' },
    trigger: { type: 'string', enum: ['MANUAL', 'SCHEDULED', 'WEBHOOK'] },
    status: { type: 'string', enum: RUN_STATUSES },
    totalCount: { type: 'number' },
    passedCount: { type: 'number' },
    failedCount: { type: 'number' },
    errorCount: { type: 'number' },
    startedAt: { type: 'string', format: 'date-time', nullable: true },
    finishedAt: { type: 'string', format: 'date-time', nullable: true },
    serviceId: { type: 'number' },
    testPageId: { type: 'number', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('Test Run')
@ApiBearerAuth()
@Controller('company')
@UseGuards(AuthGuard)
export class TestRunController {
  constructor(
    private readonly createTestRunUseCase: CreateTestRunUseCase,
    private readonly getTestRunsUseCase: GetTestRunsUseCase,
    private readonly getTestRunByIdUseCase: GetTestRunByIdUseCase,
  ) {}

  @ApiOperation({
    summary: 'Run tests now',
    description:
      'Triggers a manual test run for the service. Omit targetId to run all ' +
      'active targets, or pass it to run one. Publishes test.scheduled for ' +
      'the executor; the run starts QUEUED and is updated as results arrive. ' +
      'Restricted to BUSINESS_OWNER and BUSINESS_ADMIN. Plan limit ' +
      'maxTestRunsPerMonth applies.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'number',
          description: 'Optional. Restrict the run to a single page.',
        },
        definitionId: {
          type: 'number',
          description:
            'Optional. Run a single test (requires its pageId too).',
        },
      },
    },
  })
  @ApiResponseDecorator({ status: 201, schema: apiResponseSchema(testRunSchema) })
  @ApiResponseDecorator({ status: 400, description: 'No enabled tests to run.' })
  @ApiResponseDecorator({ status: 403, description: 'Not a manager, or monthly run limit reached.' })
  @ApiResponseDecorator({ status: 404, description: 'Service or target not found.' })
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/environments/:envId/services/:serviceId/test-runs')
  @UseGuards(CompanyManagerGuard)
  async run(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Body(new ZodValidationPipe(CreateTestRunDto)) dto: CreateTestRunDtoSchema,
    @Req() req: Request,
  ): Promise<ApiResponse<TestRun>> {
    const run = await this.createTestRunUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      pageId: dto.pageId,
      definitionId: dto.definitionId,
      triggeredByUserId: (req as any).user?.sub ?? null,
    });
    return createResponse(true, null, run);
  }

  @ApiOperation({
    summary: 'List test runs for a service',
    description: 'Returns the service\'s test runs, newest first.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiResponseDecorator({
    status: 200,
    schema: apiResponseSchema({
      type: 'object',
      properties: {
        data: { type: 'array', items: testRunSchema },
        total: { type: 'number' },
      },
    }),
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id/environments/:envId/services/:serviceId/test-runs')
  @UseGuards(CompanyAccessGuard)
  async list(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
  ): Promise<ApiResponse<{ data: TestRun[]; total: number }>> {
    const result = await this.getTestRunsUseCase.execute({
      companyId,
      environmentId,
      serviceId,
    });
    return createResponse(true, null, result);
  }

  @ApiOperation({
    summary: 'Get a test run with its results',
    description: 'Returns a single run including every persisted TestResult.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiParam({ name: 'runId', type: 'number' })
  @ApiResponseDecorator({ status: 200, description: 'Run with results.' })
  @ApiResponseDecorator({ status: 404, description: 'Run not found.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id/environments/:envId/services/:serviceId/test-runs/:runId')
  @UseGuards(CompanyAccessGuard)
  async getOne(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('runId', ParseIntPipe) runId: number,
  ): Promise<ApiResponse<unknown>> {
    const run = await this.getTestRunByIdUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      runId,
    });
    return createResponse(true, null, run);
  }
}

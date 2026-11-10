import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { CompanyAccessGuard } from '@/modules/company/guards/company-access.guard';
import { CompanyManagerGuard } from '@/modules/company/guards/company-manager.guard';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import { createResponse } from '@/shared/utils/createResponse';
import { ApiResponse } from '@/shared/types/apiResponse';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';
import {
  CreateTestPageDto,
  CreateTestPageDtoSchema,
  HTTP_METHODS,
} from '@/modules/test-page/dtos/CreateTestPageDto';
import {
  UpdateTestPageDto,
  UpdateTestPageDtoSchema,
} from '@/modules/test-page/dtos/UpdateTestPageDto';
import { TestPageView } from '@/modules/test-page/types/testPageView';
import { CreateTestPageUseCase } from '@/modules/test-page/usecases/createTestPage.usecase';
import { GetTestPagesUseCase } from '@/modules/test-page/usecases/getTestPages.usecase';
import { GetTestPageByIdUseCase } from '@/modules/test-page/usecases/getTestPageById.usecase';
import { UpdateTestPageUseCase } from '@/modules/test-page/usecases/updateTestPage.usecase';
import { DeleteTestPageUseCase } from '@/modules/test-page/usecases/deleteTestPage.usecase';

const AUTH_KINDS = ['NONE', 'BEARER_TOKEN', 'API_KEY_HEADER', 'BASIC'];

const testPageSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    description: { type: 'string', nullable: true },
    path: { type: 'string', nullable: true },
    absoluteUrl: { type: 'string', nullable: true },
    method: { type: 'string', enum: HTTP_METHODS as unknown as string[] },
    status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
    accessConfig: { type: 'object', nullable: true },
    authKind: { type: 'string', enum: AUTH_KINDS },
    hasAuthSecret: { type: 'boolean' },
    scheduleEnabled: { type: 'boolean' },
    scheduleIntervalHours: { type: 'number', nullable: true },
    nextScheduledAt: { type: 'string', format: 'date-time', nullable: true },
    runOnWebhook: { type: 'boolean' },
    serviceId: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const createBody = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', example: 'Login endpoint' },
    description: { type: 'string', nullable: true },
    path: {
      type: 'string',
      example: '/api/auth/login',
      description: 'Relative to the service baseUrl. Provide this OR absoluteUrl.',
    },
    absoluteUrl: { type: 'string', nullable: true },
    method: { type: 'string', enum: HTTP_METHODS as unknown as string[], default: 'GET' },
    accessConfig: {
      type: 'object',
      nullable: true,
      properties: {
        expectedStatusWithoutAuth: { type: 'number', example: 401 },
        customHeaders: { type: 'object' },
        ipAllowlist: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
      },
    },
    authKind: { type: 'string', enum: AUTH_KINDS, default: 'NONE' },
    authSecret: {
      type: 'string',
      description:
        'Plaintext credential (token/basic creds). Encrypted at rest and never returned. Required when authKind != NONE.',
    },
  },
};

@ApiTags('Test Target')
@ApiBearerAuth()
@Controller('company')
@UseGuards(AuthGuard)
export class TestPageController {
  constructor(
    private readonly createTestPageUseCase: CreateTestPageUseCase,
    private readonly getTestPagesUseCase: GetTestPagesUseCase,
    private readonly getTestPageByIdUseCase: GetTestPageByIdUseCase,
    private readonly updateTestPageUseCase: UpdateTestPageUseCase,
    private readonly deleteTestPageUseCase: DeleteTestPageUseCase,
  ) {}

  @ApiOperation({
    summary: 'List test targets for a service',
    description:
      'Returns all registered pages/endpoints (test targets) for the ' +
      'service. Any authenticated company member can view them.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiResponseDecorator({
    status: 200,
    schema: apiResponseSchema({
      type: 'object',
      properties: {
        data: { type: 'array', items: testPageSchema },
        total: { type: 'number' },
      },
    }),
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id/environments/:envId/services/:serviceId/test-pages')
  @UseGuards(CompanyAccessGuard)
  async list(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
  ): Promise<ApiResponse<{ data: TestPageView[]; total: number }>> {
    const result = await this.getTestPagesUseCase.execute({
      companyId,
      environmentId,
      serviceId,
    });
    return createResponse(true, null, result);
  }

  @ApiOperation({
    summary: 'Get a single test target',
    description: 'Returns one test target. Secrets are never included.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiParam({ name: 'targetId', type: 'number' })
  @ApiResponseDecorator({ status: 200, schema: apiResponseSchema(testPageSchema) })
  @ApiResponseDecorator({ status: 404, description: 'Target not found.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id/environments/:envId/services/:serviceId/test-pages/:targetId')
  @UseGuards(CompanyAccessGuard)
  async getOne(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('targetId', ParseIntPipe) targetId: number,
  ): Promise<ApiResponse<TestPageView>> {
    const target = await this.getTestPageByIdUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      targetId,
    });
    return createResponse(true, null, target);
  }

  @ApiOperation({
    summary: 'Register a test target',
    description:
      'Registers a page/endpoint to be security-tested. Restricted to ' +
      'BUSINESS_OWNER and BUSINESS_ADMIN. Plan limit maxTestPages applies.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiBody({ schema: createBody })
  @ApiResponseDecorator({ status: 201, schema: apiResponseSchema(testPageSchema) })
  @ApiResponseDecorator({ status: 400, description: 'Validation error.' })
  @ApiResponseDecorator({ status: 403, description: 'Not a manager, or plan limit reached.' })
  @ApiResponseDecorator({ status: 404, description: 'Service not found.' })
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/environments/:envId/services/:serviceId/test-pages')
  @UseGuards(CompanyManagerGuard)
  async create(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Body(new ZodValidationPipe(CreateTestPageDto))
    dto: CreateTestPageDtoSchema,
  ): Promise<ApiResponse<TestPageView>> {
    const target = await this.createTestPageUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      dto,
    });
    return createResponse(true, null, target);
  }

  @ApiOperation({
    summary: 'Update a test target',
    description:
      'Updates a test target. Restricted to BUSINESS_OWNER and ' +
      'BUSINESS_ADMIN. Omit authSecret to keep the stored credential; set ' +
      'authKind to NONE to clear it.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiParam({ name: 'targetId', type: 'number' })
  @ApiBody({ schema: createBody })
  @ApiResponseDecorator({ status: 200, schema: apiResponseSchema(testPageSchema) })
  @ApiResponseDecorator({ status: 404, description: 'Target not found.' })
  @HttpCode(HttpStatus.OK)
  @Patch(':id/environments/:envId/services/:serviceId/test-pages/:targetId')
  @UseGuards(CompanyManagerGuard)
  async update(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Body(new ZodValidationPipe(UpdateTestPageDto))
    dto: UpdateTestPageDtoSchema,
  ): Promise<ApiResponse<TestPageView>> {
    const target = await this.updateTestPageUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      targetId,
      dto,
    });
    return createResponse(true, null, target);
  }

  @ApiOperation({
    summary: 'Delete a test target',
    description:
      'Permanently deletes a test target and its definitions. Restricted ' +
      'to BUSINESS_OWNER and BUSINESS_ADMIN.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiParam({ name: 'targetId', type: 'number' })
  @ApiResponseDecorator({ status: 200, schema: apiResponseSchema(testPageSchema) })
  @ApiResponseDecorator({ status: 404, description: 'Target not found.' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id/environments/:envId/services/:serviceId/test-pages/:targetId')
  @UseGuards(CompanyManagerGuard)
  async remove(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('targetId', ParseIntPipe) targetId: number,
  ): Promise<ApiResponse<TestPageView>> {
    const target = await this.deleteTestPageUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      targetId,
    });
    return createResponse(true, null, target);
  }
}

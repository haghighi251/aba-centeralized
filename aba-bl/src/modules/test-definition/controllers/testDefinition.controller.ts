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
import { TestDefinition } from '@aba/database';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { CompanyAccessGuard } from '@/modules/company/guards/company-access.guard';
import { CompanyManagerGuard } from '@/modules/company/guards/company-manager.guard';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import { createResponse } from '@/shared/utils/createResponse';
import { ApiResponse } from '@/shared/types/apiResponse';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';
import {
  CreateTestDefinitionDto,
  CreateTestDefinitionDtoSchema,
} from '@/modules/test-definition/dtos/CreateTestDefinitionDto';
import {
  UpdateTestDefinitionDto,
  UpdateTestDefinitionDtoSchema,
} from '@/modules/test-definition/dtos/UpdateTestDefinitionDto';
import { CreateTestDefinitionUseCase } from '@/modules/test-definition/usecases/createTestDefinition.usecase';
import { CloneTestDefinitionUseCase } from '@/modules/test-definition/usecases/cloneTestDefinition.usecase';
import { GetTestDefinitionsUseCase } from '@/modules/test-definition/usecases/getTestDefinitions.usecase';
import { UpdateTestDefinitionUseCase } from '@/modules/test-definition/usecases/updateTestDefinition.usecase';
import { DeleteTestDefinitionUseCase } from '@/modules/test-definition/usecases/deleteTestDefinition.usecase';

const TEST_TYPES = ['GLOBAL_SECURITY', 'CUSTOM_API', 'BROWSER'];
const TEST_ENGINES = ['POSTMAN', 'PLAYWRIGHT'];
const TEST_SOURCES = ['MANUAL', 'AI_SUGGESTED', 'SWAGGER_IMPORT', 'POSTMAN_IMPORT'];

const definitionSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    type: { type: 'string', enum: TEST_TYPES },
    engine: { type: 'string', enum: TEST_ENGINES },
    source: { type: 'string', enum: TEST_SOURCES },
    templateKey: { type: 'string', nullable: true },
    enabled: { type: 'boolean' },
    config: { type: 'object', nullable: true },
    assertions: { type: 'object', nullable: true },
    testPageId: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const createBody = {
  type: 'object',
  required: ['name', 'type'],
  properties: {
    name: { type: 'string', example: 'Login requires CSRF token' },
    type: { type: 'string', enum: TEST_TYPES, example: 'CUSTOM_API' },
    engine: {
      type: 'string',
      enum: TEST_ENGINES,
      description: 'Optional. Defaults to POSTMAN for CUSTOM_API, else PLAYWRIGHT.',
    },
    source: { type: 'string', enum: TEST_SOURCES, default: 'MANUAL' },
    templateKey: {
      type: 'string',
      description: 'Required for GLOBAL_SECURITY (e.g. "csrf", "security-headers").',
    },
    enabled: { type: 'boolean', default: true },
    config: {
      type: 'object',
      description: 'For CUSTOM_API: { method, pathOverride, headers, query, body }.',
      example: { method: 'POST', body: { email: 'x@y.z', password: 'bad' } },
    },
    assertions: {
      type: 'object',
      description:
        'What to assert. Set negative:true for "must NOT be accessible" checks.',
      example: { status: [401, 403], negative: true },
    },
  },
};

@ApiTags('Test Definition')
@ApiBearerAuth()
@Controller('company')
@UseGuards(AuthGuard)
export class TestDefinitionController {
  constructor(
    private readonly createTestDefinitionUseCase: CreateTestDefinitionUseCase,
    private readonly cloneTestDefinitionUseCase: CloneTestDefinitionUseCase,
    private readonly getTestDefinitionsUseCase: GetTestDefinitionsUseCase,
    private readonly updateTestDefinitionUseCase: UpdateTestDefinitionUseCase,
    private readonly deleteTestDefinitionUseCase: DeleteTestDefinitionUseCase,
  ) {}

  @ApiOperation({
    summary: 'List tests for a target',
    description: 'Returns all test definitions attached to a test target.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiParam({ name: 'targetId', type: 'number' })
  @ApiResponseDecorator({
    status: 200,
    schema: apiResponseSchema({
      type: 'object',
      properties: {
        data: { type: 'array', items: definitionSchema },
        total: { type: 'number' },
      },
    }),
  })
  @HttpCode(HttpStatus.OK)
  @Get(
    ':id/environments/:envId/services/:serviceId/test-pages/:targetId/test-definitions',
  )
  @UseGuards(CompanyAccessGuard)
  async list(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('targetId', ParseIntPipe) targetId: number,
  ): Promise<ApiResponse<{ data: TestDefinition[]; total: number }>> {
    const result = await this.getTestDefinitionsUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      targetId,
    });
    return createResponse(true, null, result);
  }

  @ApiOperation({
    summary: 'Add a test to a target',
    description:
      'Creates a test definition. Restricted to BUSINESS_OWNER and ' +
      'BUSINESS_ADMIN. Plan limit maxTestDefinitions applies per target.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiParam({ name: 'targetId', type: 'number' })
  @ApiBody({ schema: createBody })
  @ApiResponseDecorator({ status: 201, schema: apiResponseSchema(definitionSchema) })
  @ApiResponseDecorator({ status: 400, description: 'Validation error.' })
  @ApiResponseDecorator({ status: 403, description: 'Not a manager, or plan limit reached.' })
  @ApiResponseDecorator({ status: 404, description: 'Target not found.' })
  @HttpCode(HttpStatus.CREATED)
  @Post(
    ':id/environments/:envId/services/:serviceId/test-pages/:targetId/test-definitions',
  )
  @UseGuards(CompanyManagerGuard)
  async create(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Body(new ZodValidationPipe(CreateTestDefinitionDto))
    dto: CreateTestDefinitionDtoSchema,
  ): Promise<ApiResponse<TestDefinition>> {
    const def = await this.createTestDefinitionUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      targetId,
      dto,
    });
    return createResponse(true, null, def);
  }

  @ApiOperation({
    summary: 'Update a test',
    description:
      'Updates a test definition. Restricted to BUSINESS_OWNER and ' +
      'BUSINESS_ADMIN. The test type is immutable; recreate to change it.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiParam({ name: 'targetId', type: 'number' })
  @ApiParam({ name: 'definitionId', type: 'number' })
  @ApiBody({ schema: createBody })
  @ApiResponseDecorator({ status: 200, schema: apiResponseSchema(definitionSchema) })
  @ApiResponseDecorator({ status: 404, description: 'Definition not found.' })
  @HttpCode(HttpStatus.OK)
  @Patch(
    ':id/environments/:envId/services/:serviceId/test-pages/:targetId/test-definitions/:definitionId',
  )
  @UseGuards(CompanyManagerGuard)
  async update(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Param('definitionId', ParseIntPipe) definitionId: number,
    @Body(new ZodValidationPipe(UpdateTestDefinitionDto))
    dto: UpdateTestDefinitionDtoSchema,
  ): Promise<ApiResponse<TestDefinition>> {
    const def = await this.updateTestDefinitionUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      targetId,
      definitionId,
      dto,
    });
    return createResponse(true, null, def);
  }

  @ApiOperation({
    summary: 'Delete a test',
    description:
      'Deletes a test definition. Restricted to BUSINESS_OWNER and ' +
      'BUSINESS_ADMIN.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiParam({ name: 'targetId', type: 'number' })
  @ApiParam({ name: 'definitionId', type: 'number' })
  @ApiResponseDecorator({ status: 200, schema: apiResponseSchema(definitionSchema) })
  @ApiResponseDecorator({ status: 404, description: 'Definition not found.' })
  @HttpCode(HttpStatus.OK)
  @Delete(
    ':id/environments/:envId/services/:serviceId/test-pages/:targetId/test-definitions/:definitionId',
  )
  @UseGuards(CompanyManagerGuard)
  async remove(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Param('definitionId', ParseIntPipe) definitionId: number,
  ): Promise<ApiResponse<TestDefinition>> {
    const def = await this.deleteTestDefinitionUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      targetId,
      definitionId,
    });
    return createResponse(true, null, def);
  }

  @ApiOperation({
    summary: 'Clone a test',
    description:
      'Duplicates a test into a disabled "<name> (copy)" so the customer can ' +
      'tweak a copy instead of rebuilding the configuration. Restricted to ' +
      'BUSINESS_OWNER and BUSINESS_ADMIN. Plan limit maxTestDefinitions applies.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiParam({ name: 'targetId', type: 'number' })
  @ApiParam({ name: 'definitionId', type: 'number' })
  @ApiResponseDecorator({ status: 201, schema: apiResponseSchema(definitionSchema) })
  @ApiResponseDecorator({ status: 403, description: 'Not a manager, or plan limit reached.' })
  @ApiResponseDecorator({ status: 404, description: 'Definition not found.' })
  @HttpCode(HttpStatus.CREATED)
  @Post(
    ':id/environments/:envId/services/:serviceId/test-pages/:targetId/test-definitions/:definitionId/clone',
  )
  @UseGuards(CompanyManagerGuard)
  async clone(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('targetId', ParseIntPipe) targetId: number,
    @Param('definitionId', ParseIntPipe) definitionId: number,
  ): Promise<ApiResponse<TestDefinition>> {
    const def = await this.cloneTestDefinitionUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      targetId,
      definitionId,
    });
    return createResponse(true, null, def);
  }
}

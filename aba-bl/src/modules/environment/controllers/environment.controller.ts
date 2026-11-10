import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse as ApiResponseDecorator,
  ApiTags,
} from '@nestjs/swagger';
import { Environment } from '@aba/database';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { CompanyAccessGuard } from '@/modules/company/guards/company-access.guard';
import { CompanyManagerGuard } from '@/modules/company/guards/company-manager.guard';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import { createResponse } from '@/shared/utils/createResponse';
import { ApiResponse } from '@/shared/types/apiResponse';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';
import {
  CreateEnvironmentDto,
  CreateEnvironmentDtoSchema,
} from '@/modules/environment/dtos/CreateEnvironmentDto';
import {
  UpdateEnvironmentDto,
  UpdateEnvironmentDtoSchema,
} from '@/modules/environment/dtos/UpdateEnvironmentDto';
import {
  EnvironmentFilterDto,
  EnvironmentFilterDtoSchema,
} from '@/modules/environment/dtos/environmentFilter';
import { CreateEnvironmentUseCase } from '@/modules/environment/usecases/createEnvironment.usecase';
import { GetEnvironmentsUseCase } from '@/modules/environment/usecases/getEnvironments.usecase';
import { GetEnvironmentByIdUseCase } from '@/modules/environment/usecases/getEnvironmentById.usecase';
import { UpdateEnvironmentUseCase } from '@/modules/environment/usecases/updateEnvironment.usecase';
import { DeleteEnvironmentUseCase } from '@/modules/environment/usecases/deleteEnvironment.usecase';

const environmentSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    slug: { type: 'string' },
    type: {
      type: 'string',
      enum: [
        'DEVELOPMENT',
        'TESTING',
        'STAGING',
        'PRODUCTION',
        'PREVIEW',
        'DISASTER',
        'DEMO',
        'SUPPORT',
        'EXPERIMENTAL',
        'CUSTOM',
      ],
    },
    isProduction: { type: 'boolean' },
    order: { type: 'number' },
    description: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
    companyId: { type: 'number' },
    teamId: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const environmentListSchema = {
  type: 'object',
  properties: {
    data: { type: 'array', items: environmentSchema },
    total: { type: 'number' },
  },
};

const createEnvironmentBody = {
  type: 'object',
  required: ['name', 'teamId'],
  properties: {
    teamId: {
      type: 'number',
      description: 'Id of the team this environment belongs to.',
      example: 1,
    },
    name: { type: 'string', example: 'Production' },
    slug: {
      type: 'string',
      example: 'production',
      description:
        'Lowercase, hyphenated identifier. Derived from name if omitted.',
    },
    type: {
      type: 'string',
      enum: [
        'DEVELOPMENT',
        'TESTING',
        'STAGING',
        'PRODUCTION',
        'PREVIEW',
        'DISASTER',
        'DEMO',
        'SUPPORT',
        'EXPERIMENTAL',
        'CUSTOM',
      ],
      default: 'CUSTOM',
    },
    isProduction: { type: 'boolean', default: false },
    order: {
      type: 'number',
      description: 'Pipeline order (1=Dev, 2=Test, 3=Staging, 4=Prod, ...).',
      example: 4,
    },
    description: { type: 'string', nullable: true },
  },
};

const updateEnvironmentBody = {
  type: 'object',
  properties: {
    teamId: {
      type: 'number',
      description:
        'Move this environment to a different team within the same company.',
    },
    name: { type: 'string' },
    slug: { type: 'string' },
    type: {
      type: 'string',
      enum: [
        'DEVELOPMENT',
        'TESTING',
        'STAGING',
        'PRODUCTION',
        'PREVIEW',
        'DISASTER',
        'DEMO',
        'SUPPORT',
        'EXPERIMENTAL',
        'CUSTOM',
      ],
    },
    isProduction: { type: 'boolean' },
    order: { type: 'number' },
    description: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
  },
};

@ApiTags('Environment')
@ApiBearerAuth()
@Controller('company')
@UseGuards(AuthGuard)
export class EnvironmentController {
  constructor(
    private readonly createEnvironmentUseCase: CreateEnvironmentUseCase,
    private readonly getEnvironmentsUseCase: GetEnvironmentsUseCase,
    private readonly getEnvironmentByIdUseCase: GetEnvironmentByIdUseCase,
    private readonly updateEnvironmentUseCase: UpdateEnvironmentUseCase,
    private readonly deleteEnvironmentUseCase: DeleteEnvironmentUseCase,
  ) {}

  @ApiOperation({
    summary: 'List environments for a company',
    description:
      'Returns all environments (dev/test/staging/prod/custom) belonging to the ' +
      'company, ordered by pipeline order. Any authenticated member of the ' +
      'company (including BUSINESS_MEMBER) can view this list.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Filters by name/slug.',
  })
  @ApiQuery({
    name: 'teamId',
    required: false,
    type: Number,
    description: 'Filters to environments belonging to this team.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: [
      'DEVELOPMENT',
      'TESTING',
      'STAGING',
      'PRODUCTION',
      'PREVIEW',
      'DISASTER',
      'DEMO',
      'SUPPORT',
      'EXPERIMENTAL',
      'CUSTOM',
    ],
  })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'ARCHIVED'] })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['order', 'name', 'createdAt'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponseDecorator({
    status: 200,
    description: 'List of environments.',
    schema: apiResponseSchema(environmentListSchema),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller does not belong to this company.',
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id/environments')
  @UseGuards(CompanyAccessGuard)
  async getEnvironments(
    @Param('id', ParseIntPipe) companyId: number,
    @Query(new ZodValidationPipe(EnvironmentFilterDto))
    query: EnvironmentFilterDtoSchema,
  ): Promise<ApiResponse<{ data: Environment[]; total: number }>> {
    const result = await this.getEnvironmentsUseCase.execute({
      companyId,
      ...query,
    });
    return createResponse(true, null, result);
  }

  @ApiOperation({
    summary: 'Get a single environment',
    description:
      'Returns a single environment by id. Any authenticated member of the ' +
      'company (including BUSINESS_MEMBER) can view it.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Environment details.',
    schema: apiResponseSchema(environmentSchema),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller does not belong to this company.',
  })
  @ApiResponseDecorator({ status: 404, description: 'Environment not found.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id/environments/:envId')
  @UseGuards(CompanyAccessGuard)
  async getEnvironment(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
  ): Promise<ApiResponse<Environment>> {
    const environment = await this.getEnvironmentByIdUseCase.execute({
      companyId,
      environmentId,
    });
    return createResponse(true, null, environment);
  }

  @ApiOperation({
    summary: 'Create a new environment',
    description:
      'Creates a new environment (e.g. dev/test/staging/prod) for the company. ' +
      'Restricted to BUSINESS_OWNER and BUSINESS_ADMIN. BUSINESS_MEMBER callers ' +
      'receive a 403 Forbidden.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiBody({ schema: createEnvironmentBody })
  @ApiResponseDecorator({
    status: 201,
    description: 'Environment created.',
    schema: apiResponseSchema(environmentSchema),
  })
  @ApiResponseDecorator({ status: 400, description: 'Validation error.' })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller is not a company manager.',
  })
  @ApiResponseDecorator({ status: 404, description: 'Team not found.' })
  @ApiResponseDecorator({
    status: 409,
    description:
      'An environment with this slug, name, or order already exists.',
  })
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/environments')
  @UseGuards(CompanyManagerGuard)
  async createEnvironment(
    @Param('id', ParseIntPipe) companyId: number,
    @Body(new ZodValidationPipe(CreateEnvironmentDto))
    dto: CreateEnvironmentDtoSchema,
  ): Promise<ApiResponse<Environment>> {
    const environment = await this.createEnvironmentUseCase.execute({
      companyId,
      dto,
    });
    return createResponse(true, null, environment);
  }

  @ApiOperation({
    summary: 'Update an environment',
    description:
      'Updates an environment for the company. Restricted to BUSINESS_OWNER ' +
      'and BUSINESS_ADMIN. BUSINESS_MEMBER callers receive a 403 Forbidden.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiBody({ schema: updateEnvironmentBody })
  @ApiResponseDecorator({
    status: 200,
    description: 'Environment updated.',
    schema: apiResponseSchema(environmentSchema),
  })
  @ApiResponseDecorator({ status: 400, description: 'Validation error.' })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller is not a company manager.',
  })
  @ApiResponseDecorator({
    status: 404,
    description: 'Environment or team not found.',
  })
  @ApiResponseDecorator({
    status: 409,
    description:
      'An environment with this slug, name, or order already exists.',
  })
  @HttpCode(HttpStatus.OK)
  @Put(':id/environments/:envId')
  @UseGuards(CompanyManagerGuard)
  async updateEnvironment(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Body(new ZodValidationPipe(UpdateEnvironmentDto))
    dto: UpdateEnvironmentDtoSchema,
  ): Promise<ApiResponse<Environment>> {
    const environment = await this.updateEnvironmentUseCase.execute({
      companyId,
      environmentId,
      dto,
    });
    return createResponse(true, null, environment);
  }

  @ApiOperation({
    summary: 'Delete an environment',
    description:
      'Permanently deletes an environment from the company. Restricted to ' +
      'BUSINESS_OWNER and BUSINESS_ADMIN. BUSINESS_MEMBER callers receive a ' +
      '403 Forbidden.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Environment deleted.',
    schema: apiResponseSchema(environmentSchema),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller is not a company manager.',
  })
  @ApiResponseDecorator({ status: 404, description: 'Environment not found.' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id/environments/:envId')
  @UseGuards(CompanyManagerGuard)
  async deleteEnvironment(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
  ): Promise<ApiResponse<Environment>> {
    const environment = await this.deleteEnvironmentUseCase.execute({
      companyId,
      environmentId,
    });
    return createResponse(true, null, environment);
  }
}

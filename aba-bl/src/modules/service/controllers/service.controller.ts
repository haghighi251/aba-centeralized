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
import { Service } from '@aba/database';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { CompanyAccessGuard } from '@/modules/company/guards/company-access.guard';
import { CompanyManagerGuard } from '@/modules/company/guards/company-manager.guard';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import { createResponse } from '@/shared/utils/createResponse';
import { ApiResponse } from '@/shared/types/apiResponse';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';
import {
  CreateServiceDto,
  CreateServiceDtoSchema,
} from '@/modules/service/dtos/CreateServiceDto';
import {
  UpdateServiceDto,
  UpdateServiceDtoSchema,
} from '@/modules/service/dtos/UpdateServiceDto';
import {
  ServiceFilterDto,
  ServiceFilterDtoSchema,
} from '@/modules/service/dtos/serviceFilter';
import { CreateServiceUseCase } from '@/modules/service/usecases/createService.usecase';
import { GetServicesUseCase } from '@/modules/service/usecases/getServices.usecase';
import { GetServiceByIdUseCase } from '@/modules/service/usecases/getServiceById.usecase';
import { UpdateServiceUseCase } from '@/modules/service/usecases/updateService.usecase';
import { DeleteServiceUseCase } from '@/modules/service/usecases/deleteService.usecase';

const SERVICE_TYPES = [
  'BFF',
  'API_GATEWAY',
  'MICROSERVICE',
  'WORKER',
  'FRONTEND',
  'DATABASE',
  'CACHE',
  'MESSAGE_QUEUE',
  'OTHER',
];

const rateLimitConfigSchema = {
  type: 'object',
  nullable: true,
  properties: {
    windowMs: { type: 'number', example: 60000 },
    max: { type: 'number', example: 100 },
  },
};

const serviceSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    slug: { type: 'string' },
    type: { type: 'string', enum: SERVICE_TYPES },
    description: { type: 'string', nullable: true },
    baseUrl: { type: 'string' },
    rateLimitConfig: rateLimitConfigSchema,
    status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
    companyId: { type: 'number' },
    environmentId: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const serviceListSchema = {
  type: 'object',
  properties: {
    data: { type: 'array', items: serviceSchema },
    total: { type: 'number' },
  },
};

const createServiceBody = {
  type: 'object',
  required: ['name', 'baseUrl'],
  properties: {
    name: { type: 'string', example: 'API Gateway' },
    slug: {
      type: 'string',
      example: 'api-gateway',
      description:
        'Lowercase, hyphenated identifier. Derived from name if omitted.',
    },
    type: { type: 'string', enum: SERVICE_TYPES, default: 'OTHER' },
    description: { type: 'string', nullable: true },
    baseUrl: { type: 'string', example: 'https://api.example.com' },
    rateLimitConfig: rateLimitConfigSchema,
  },
};

const updateServiceBody = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    slug: { type: 'string' },
    type: { type: 'string', enum: SERVICE_TYPES },
    description: { type: 'string', nullable: true },
    baseUrl: { type: 'string' },
    rateLimitConfig: rateLimitConfigSchema,
    status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
  },
};

@ApiTags('Service')
@ApiBearerAuth()
@Controller('company')
@UseGuards(AuthGuard)
export class ServiceController {
  constructor(
    private readonly createServiceUseCase: CreateServiceUseCase,
    private readonly getServicesUseCase: GetServicesUseCase,
    private readonly getServiceByIdUseCase: GetServiceByIdUseCase,
    private readonly updateServiceUseCase: UpdateServiceUseCase,
    private readonly deleteServiceUseCase: DeleteServiceUseCase,
  ) {}

  @ApiOperation({
    summary: 'List services for an environment',
    description:
      'Returns all services registered under the environment. Any ' +
      'authenticated member of the company (including BUSINESS_MEMBER) can ' +
      'view this list.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Filters by name/slug.',
  })
  @ApiQuery({ name: 'type', required: false, enum: SERVICE_TYPES })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'ARCHIVED'] })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'createdAt'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponseDecorator({
    status: 200,
    description: 'List of services.',
    schema: apiResponseSchema(serviceListSchema),
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
  @Get(':id/environments/:envId/services')
  @UseGuards(CompanyAccessGuard)
  async getServices(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Query(new ZodValidationPipe(ServiceFilterDto))
    query: ServiceFilterDtoSchema,
  ): Promise<ApiResponse<{ data: Service[]; total: number }>> {
    const result = await this.getServicesUseCase.execute({
      companyId,
      environmentId,
      ...query,
    });
    return createResponse(true, null, result);
  }

  @ApiOperation({
    summary: 'Get a single service',
    description:
      'Returns a single service by id. Any authenticated member of the ' +
      'company (including BUSINESS_MEMBER) can view it.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Service details.',
    schema: apiResponseSchema(serviceSchema),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller does not belong to this company.',
  })
  @ApiResponseDecorator({
    status: 404,
    description: 'Environment or service not found.',
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id/environments/:envId/services/:serviceId')
  @UseGuards(CompanyAccessGuard)
  async getService(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
  ): Promise<ApiResponse<Service>> {
    const service = await this.getServiceByIdUseCase.execute({
      companyId,
      environmentId,
      serviceId,
    });
    return createResponse(true, null, service);
  }

  @ApiOperation({
    summary: 'Register a new service',
    description:
      'Registers a new service (e.g. BFF, API gateway, worker) under the ' +
      'environment. Restricted to BUSINESS_OWNER and BUSINESS_ADMIN. ' +
      'BUSINESS_MEMBER callers receive a 403 Forbidden.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiBody({ schema: createServiceBody })
  @ApiResponseDecorator({
    status: 201,
    description: 'Service created.',
    schema: apiResponseSchema(serviceSchema),
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
  @ApiResponseDecorator({ status: 404, description: 'Environment not found.' })
  @ApiResponseDecorator({
    status: 409,
    description: 'A service with this slug already exists in the environment.',
  })
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/environments/:envId/services')
  @UseGuards(CompanyManagerGuard)
  async createService(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Body(new ZodValidationPipe(CreateServiceDto))
    dto: CreateServiceDtoSchema,
  ): Promise<ApiResponse<Service>> {
    const service = await this.createServiceUseCase.execute({
      companyId,
      environmentId,
      dto,
    });
    return createResponse(true, null, service);
  }

  @ApiOperation({
    summary: 'Update a service',
    description:
      'Updates a service under the environment. Restricted to ' +
      'BUSINESS_OWNER and BUSINESS_ADMIN. BUSINESS_MEMBER callers receive a ' +
      '403 Forbidden.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiBody({ schema: updateServiceBody })
  @ApiResponseDecorator({
    status: 200,
    description: 'Service updated.',
    schema: apiResponseSchema(serviceSchema),
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
    description: 'Environment or service not found.',
  })
  @ApiResponseDecorator({
    status: 409,
    description: 'A service with this slug already exists in the environment.',
  })
  @HttpCode(HttpStatus.OK)
  @Put(':id/environments/:envId/services/:serviceId')
  @UseGuards(CompanyManagerGuard)
  async updateService(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Body(new ZodValidationPipe(UpdateServiceDto))
    dto: UpdateServiceDtoSchema,
  ): Promise<ApiResponse<Service>> {
    const service = await this.updateServiceUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      dto,
    });
    return createResponse(true, null, service);
  }

  @ApiOperation({
    summary: 'Delete a service',
    description:
      'Permanently deletes a service from the environment. Restricted to ' +
      'BUSINESS_OWNER and BUSINESS_ADMIN. BUSINESS_MEMBER callers receive a ' +
      '403 Forbidden.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Service deleted.',
    schema: apiResponseSchema(serviceSchema),
  })
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
    description: 'Environment or service not found.',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id/environments/:envId/services/:serviceId')
  @UseGuards(CompanyManagerGuard)
  async deleteService(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
  ): Promise<ApiResponse<Service>> {
    const service = await this.deleteServiceUseCase.execute({
      companyId,
      environmentId,
      serviceId,
    });
    return createResponse(true, null, service);
  }
}

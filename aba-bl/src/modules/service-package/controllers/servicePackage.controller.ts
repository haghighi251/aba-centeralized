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
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
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
import { CompanyAccessGuard } from '@/modules/company/guards/company-access.guard';
import { CompanyManagerGuard } from '@/modules/company/guards/company-manager.guard';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import { createResponse } from '@/shared/utils/createResponse';
import { ApiResponse } from '@/shared/types/apiResponse';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';
import {
  CreateServicePackageDto,
  CreateServicePackageDtoSchema,
} from '@/modules/service-package/dtos/CreateServicePackageDto';
import {
  UpdateServicePackageDto,
  UpdateServicePackageDtoSchema,
} from '@/modules/service-package/dtos/UpdateServicePackageDto';
import {
  BulkImportServicePackagesDto,
  BulkImportServicePackagesDtoSchema,
} from '@/modules/service-package/dtos/BulkImportServicePackagesDto';
import {
  ServicePackageFilterDto,
  ServicePackageFilterDtoSchema,
  ServicePackageHistoryFilterDto,
  ServicePackageHistoryFilterDtoSchema,
} from '@/modules/service-package/dtos/servicePackageFilter';
import { GetServicePackagesUseCase } from '@/modules/service-package/usecases/getServicePackages.usecase';
import { GetServicePackageHistoryUseCase } from '@/modules/service-package/usecases/getServicePackageHistory.usecase';
import { CreateServicePackageUseCase } from '@/modules/service-package/usecases/createServicePackage.usecase';
import { UpdateServicePackageUseCase } from '@/modules/service-package/usecases/updateServicePackage.usecase';
import { DeleteServicePackageUseCase } from '@/modules/service-package/usecases/deleteServicePackage.usecase';
import { BulkImportServicePackagesUseCase } from '@/modules/service-package/usecases/bulkImportServicePackages.usecase';
import { GetServiceVulnerabilitiesUseCase } from '@/modules/service-package/usecases/getServiceVulnerabilities.usecase';
import { UpdateServicePackageNotificationUseCase } from '@/modules/service-package/usecases/updateServicePackageNotification.usecase';
import { LogVulnerabilityViewUseCase } from '@/modules/service-package/usecases/logVulnerabilityView.usecase';
import { ServicePackageWithPackage } from '@/modules/service-package/repositories/servicePackage.repository';
import { ServiceVulnerabilityResult } from '@/modules/service-package/repositories/vulnerability.repository';
import { BulkImportResult } from '@/modules/service-package/services/servicePackage.service';
import {
  UpdateServicePackageNotificationDto,
  UpdateServicePackageNotificationDtoSchema,
} from '@/modules/service-package/dtos/UpdateServicePackageNotificationDto';
import { ServicePackageNotificationState } from '@aba/database';

const ECOSYSTEMS = ['NPM', 'PYPI', 'MAVEN', 'RUBYGEMS', 'NUGET', 'GO', 'OTHER'];
const STATUSES = ['ACTIVE', 'STALE', 'REMOVED'];

const packageSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    ecosystem: { type: 'string', enum: ECOSYSTEMS },
    name: { type: 'string' },
    version: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

const servicePackageSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    status: { type: 'string', enum: STATUSES },
    versionRange: { type: 'string', nullable: true },
    introducedAt: { type: 'string', format: 'date-time' },
    deactivatedAt: { type: 'string', format: 'date-time', nullable: true },
    alarmCount: { type: 'number' },
    lastAlarmAt: { type: 'string', format: 'date-time', nullable: true },
    serviceId: { type: 'number' },
    packageId: { type: 'number' },
    package: packageSchema,
    notificationState: {
      type: 'object',
      nullable: true,
      properties: {
        muted: { type: 'boolean' },
        mutedAt: { type: 'string', format: 'date-time', nullable: true },
        lastNotifiedAt: { type: 'string', format: 'date-time', nullable: true },
        nextNotifyAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const servicePackageListSchema = {
  type: 'object',
  properties: {
    data: { type: 'array', items: servicePackageSchema },
    total: { type: 'number' },
  },
};

const bulkImportResultSchema = {
  type: 'object',
  properties: {
    added: {
      type: 'number',
      description: 'New packages added to this service.',
    },
    updated: {
      type: 'number',
      description: 'Packages whose versionRange was updated in-place.',
    },
    unchanged: {
      type: 'number',
      description: 'Packages already at the same version.',
    },
    staled: {
      type: 'number',
      description: 'Old versions superseded by the imported version.',
    },
  },
};

const notificationStateSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    muted: { type: 'boolean' },
    mutedAt: { type: 'string', format: 'date-time', nullable: true },
    lastNotifiedAt: { type: 'string', format: 'date-time', nullable: true },
    nextNotifyAt: { type: 'string', format: 'date-time', nullable: true },
    servicePackageId: { type: 'number' },
  },
};

const updateNotificationBody = {
  type: 'object',
  required: ['action'],
  oneOf: [
    {
      type: 'object',
      properties: { action: { type: 'string', enum: ['MUTE'] } },
    },
    {
      type: 'object',
      properties: { action: { type: 'string', enum: ['UNMUTE'] } },
    },
    {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['SNOOZE'] },
        until: {
          type: 'string',
          format: 'date-time',
          example: '2026-08-15T00:00:00.000Z',
        },
      },
    },
  ],
};

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const vulnerabilitySchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    vulnerabilityId: { type: 'string', example: 'CVE-2023-44270' },
    ecosystem: { type: 'string', enum: ECOSYSTEMS },
    packageName: { type: 'string', example: 'lodash' },
    summary: { type: 'string', nullable: true },
    severity: { type: 'string', enum: SEVERITIES, nullable: true },
    affectedRange: {
      type: 'string',
      nullable: true,
      example: '>=4.0.0 <4.17.21',
    },
    fixedVersion: { type: 'string', nullable: true, example: '4.17.21' },
    publishedAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
    affectedPackages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          packageId: { type: 'number' },
          packageName: { type: 'string' },
          packageVersion: { type: 'string' },
          alarmCount: { type: 'number' },
          lastAlarmAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },
};

@ApiTags('Service Packages')
@ApiBearerAuth()
@Controller('company')
@UseGuards(AuthGuard)
export class ServicePackageController {
  constructor(
    private readonly getServicePackagesUseCase: GetServicePackagesUseCase,
    private readonly getServicePackageHistoryUseCase: GetServicePackageHistoryUseCase,
    private readonly createServicePackageUseCase: CreateServicePackageUseCase,
    private readonly updateServicePackageUseCase: UpdateServicePackageUseCase,
    private readonly deleteServicePackageUseCase: DeleteServicePackageUseCase,
    private readonly bulkImportServicePackagesUseCase: BulkImportServicePackagesUseCase,
    private readonly getServiceVulnerabilitiesUseCase: GetServiceVulnerabilitiesUseCase,
    private readonly updateServicePackageNotificationUseCase: UpdateServicePackageNotificationUseCase,
    private readonly logVulnerabilityViewUseCase: LogVulnerabilityViewUseCase,
  ) {}

  // ── GET /packages (active list) ──────────────────────────────────────────────

  @ApiOperation({
    summary: 'List active packages for a service',
    description:
      'Returns all ACTIVE package entries for the service. ' +
      'Any authenticated company member (including BUSINESS_MEMBER) can read this list.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Filter by package name.',
  })
  @ApiQuery({ name: 'ecosystem', required: false, enum: ECOSYSTEMS })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'introducedAt'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponseDecorator({
    status: 200,
    description: 'Active package list.',
    schema: apiResponseSchema(servicePackageListSchema),
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
    description: 'Service or environment not found.',
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id/environments/:envId/services/:serviceId/packages')
  @UseGuards(CompanyAccessGuard)
  async getPackages(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Query(new ZodValidationPipe(ServicePackageFilterDto))
    query: ServicePackageFilterDtoSchema,
  ): Promise<
    ApiResponse<{ data: ServicePackageWithPackage[]; total: number }>
  > {
    const result = await this.getServicePackagesUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      ...query,
    });
    return createResponse(true, null, result);
  }

  // ── GET /packages/history (stale + removed) ────────────────────────────────

  @ApiOperation({
    summary: 'Package history for a service',
    description:
      'Returns STALE and/or REMOVED package rows for the service, ordered by ' +
      'deactivatedAt descending by default. Use this to populate the stale-packages modal.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['STALE', 'REMOVED', 'ALL'],
    description: 'Default: ALL.',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'deactivatedAt'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponseDecorator({
    status: 200,
    description: 'Package history.',
    schema: apiResponseSchema(servicePackageListSchema),
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
    description: 'Service or environment not found.',
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id/environments/:envId/services/:serviceId/packages/history')
  @UseGuards(CompanyAccessGuard)
  async getPackageHistory(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Query(new ZodValidationPipe(ServicePackageHistoryFilterDto))
    query: ServicePackageHistoryFilterDtoSchema,
  ): Promise<
    ApiResponse<{ data: ServicePackageWithPackage[]; total: number }>
  > {
    const result = await this.getServicePackageHistoryUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      ...query,
    });
    return createResponse(true, null, result);
  }

  // ── POST /packages ─────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Add a package to a service',
    description:
      'Registers one package+version as ACTIVE for this service. ' +
      'If another version of the same package is already ACTIVE it is automatically ' +
      'marked STALE and the new version takes over. ' +
      'Restricted to BUSINESS_OWNER and BUSINESS_ADMIN.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'version'],
      properties: {
        name: { type: 'string', example: 'express' },
        version: { type: 'string', example: '4.18.2' },
        versionRange: { type: 'string', example: '^4.18.0', nullable: true },
        ecosystem: { type: 'string', enum: ECOSYSTEMS, default: 'NPM' },
      },
    },
  })
  @ApiResponseDecorator({
    status: 201,
    description: 'Package added.',
    schema: apiResponseSchema(servicePackageSchema),
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
    description: 'Service or environment not found.',
  })
  @ApiResponseDecorator({
    status: 409,
    description: 'This exact version is already active for this service.',
  })
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/environments/:envId/services/:serviceId/packages')
  @UseGuards(CompanyManagerGuard)
  async createPackage(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Body(new ZodValidationPipe(CreateServicePackageDto))
    dto: CreateServicePackageDtoSchema,
    @Req() req: Request,
  ): Promise<ApiResponse<ServicePackageWithPackage>> {
    const result = await this.createServicePackageUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      actingUserId: (req as any).user.sub,
      dto,
    });
    return createResponse(true, null, result);
  }

  // ── PUT /packages/:servicePackageId ────────────────────────────────────────

  @ApiOperation({
    summary: 'Update an active package',
    description:
      'Updates version and/or versionRange of an ACTIVE ServicePackage. ' +
      'Changing the version triggers the stale-and-replace flow: the current row ' +
      'becomes STALE and a new ACTIVE row is created. ' +
      'Changing only versionRange updates the existing row in place. ' +
      'Restricted to BUSINESS_OWNER and BUSINESS_ADMIN.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiParam({
    name: 'servicePackageId',
    type: 'number',
    description: 'ServicePackage id.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string', example: '4.19.0' },
        versionRange: { type: 'string', example: '^4.19.0', nullable: true },
        ecosystem: { type: 'string', enum: ECOSYSTEMS },
      },
    },
  })
  @ApiResponseDecorator({
    status: 200,
    description: 'Package updated.',
    schema: apiResponseSchema(servicePackageSchema),
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
    description: 'Active service package not found.',
  })
  @ApiResponseDecorator({
    status: 409,
    description: 'This version is already the active version.',
  })
  @HttpCode(HttpStatus.OK)
  @Put(':id/environments/:envId/services/:serviceId/packages/:servicePackageId')
  @UseGuards(CompanyManagerGuard)
  async updatePackage(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('servicePackageId', ParseIntPipe) servicePackageId: number,
    @Body(new ZodValidationPipe(UpdateServicePackageDto))
    dto: UpdateServicePackageDtoSchema,
    @Req() req: Request,
  ): Promise<ApiResponse<ServicePackageWithPackage>> {
    const result = await this.updateServicePackageUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      servicePackageId,
      actingUserId: (req as any).user.sub,
      dto,
    });
    return createResponse(true, null, result);
  }

  // ── DELETE /packages/:servicePackageId ─────────────────────────────────────

  @ApiOperation({
    summary: 'Remove a package from a service',
    description:
      'Marks the ACTIVE ServicePackage row as REMOVED (deactivatedAt is set). ' +
      'The row disappears from the active list but remains visible in /packages/history. ' +
      'The global Package catalog row is never deleted. ' +
      'Restricted to BUSINESS_OWNER and BUSINESS_ADMIN.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiParam({
    name: 'servicePackageId',
    type: 'number',
    description: 'ServicePackage id.',
  })
  @ApiResponseDecorator({
    status: 200,
    description: 'Package marked as REMOVED.',
    schema: apiResponseSchema(servicePackageSchema),
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
    description: 'Active service package not found.',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(
    ':id/environments/:envId/services/:serviceId/packages/:servicePackageId',
  )
  @UseGuards(CompanyManagerGuard)
  async deletePackage(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('servicePackageId', ParseIntPipe) servicePackageId: number,
    @Req() req: Request,
  ): Promise<ApiResponse<ServicePackageWithPackage>> {
    const result = await this.deleteServicePackageUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      servicePackageId,
      actingUserId: (req as any).user.sub,
    });
    return createResponse(true, null, result);
  }

  // ── PUT /packages/:servicePackageId/notification-preference ───────────────

  @ApiOperation({
    summary:
      'Mute, unmute, or snooze vulnerability notifications for a package',
    description:
      'Sets whether this package should be included in future vulnerability ' +
      'notification digests. MUTE stops notifications indefinitely; SNOOZE ' +
      'defers the next notification to a chosen date without muting; UNMUTE ' +
      'reverses a mute. This state is shared for the whole service — it is ' +
      'not personal to whichever recipient set it. ' +
      'Restricted to BUSINESS_OWNER and BUSINESS_ADMIN.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiParam({
    name: 'servicePackageId',
    type: 'number',
    description: 'ServicePackage id.',
  })
  @ApiBody({ schema: updateNotificationBody })
  @ApiResponseDecorator({
    status: 200,
    description: 'Notification preference updated.',
    schema: apiResponseSchema(notificationStateSchema),
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
    description: 'Service package not found.',
  })
  @HttpCode(HttpStatus.OK)
  @Put(
    ':id/environments/:envId/services/:serviceId/packages/:servicePackageId/notification-preference',
  )
  @UseGuards(CompanyManagerGuard)
  async updateNotificationPreference(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('servicePackageId', ParseIntPipe) servicePackageId: number,
    @Body(new ZodValidationPipe(UpdateServicePackageNotificationDto))
    dto: UpdateServicePackageNotificationDtoSchema,
    @Req() req: Request,
  ): Promise<ApiResponse<ServicePackageNotificationState>> {
    const actingUserId = (req as any).user.sub;
    const result = await this.updateServicePackageNotificationUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      servicePackageId,
      actingUserId,
      dto,
    });
    return createResponse(true, null, result);
  }

  // ── POST /packages/bulk ────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Bulk-import packages from a parsed package.json',
    description:
      'Accepts an array of packages extracted client-side from a package.json file ' +
      '(dependencies + devDependencies + optionalDependencies) and upserts them into ' +
      "the service's active package list. " +
      'Packages already at the same version are left unchanged. ' +
      'Packages with a new version trigger the stale-and-replace flow. ' +
      'This is additive — packages absent from the uploaded list are not auto-removed. ' +
      'Restricted to BUSINESS_OWNER and BUSINESS_ADMIN.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['packages'],
      properties: {
        ecosystem: { type: 'string', enum: ECOSYSTEMS, default: 'NPM' },
        packages: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'version'],
            properties: {
              name: { type: 'string', example: 'express' },
              version: { type: 'string', example: '4.18.2' },
              versionRange: {
                type: 'string',
                example: '^4.18.0',
                nullable: true,
              },
            },
          },
        },
      },
    },
  })
  @ApiResponseDecorator({
    status: 201,
    description: 'Import summary.',
    schema: apiResponseSchema(bulkImportResultSchema),
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
    description: 'Service or environment not found.',
  })
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/environments/:envId/services/:serviceId/packages/bulk')
  @UseGuards(CompanyManagerGuard)
  async bulkImport(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Body(new ZodValidationPipe(BulkImportServicePackagesDto))
    dto: BulkImportServicePackagesDtoSchema,
    @Req() req: Request,
  ): Promise<ApiResponse<BulkImportResult>> {
    const result = await this.bulkImportServicePackagesUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      actingUserId: (req as any).user.sub,
      dto,
    });
    return createResponse(true, null, result);
  }

  // ── GET /vulnerabilities ───────────────────────────────────────────────────

  @ApiOperation({
    summary: 'List vulnerabilities affecting active packages of a service',
    description:
      'Returns all known vulnerabilities that match at least one of the ACTIVE ' +
      'packages registered for this service. Results include which package version ' +
      'is affected and the current alarm counters.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiQuery({ name: 'severity', required: false, enum: SEVERITIES })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Filter by package name, CVE id, or summary.',
  })
  @ApiResponseDecorator({
    status: 200,
    description: 'Vulnerability list.',
    schema: apiResponseSchema({
      type: 'object',
      properties: {
        data: { type: 'array', items: vulnerabilitySchema },
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
    description: 'Caller does not belong to this company.',
  })
  @ApiResponseDecorator({
    status: 404,
    description: 'Service or environment not found.',
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id/environments/:envId/services/:serviceId/vulnerabilities')
  @UseGuards(CompanyAccessGuard)
  async getVulnerabilities(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Query('severity') severity?: string,
    @Query('search') search?: string,
  ): Promise<
    ApiResponse<{ data: ServiceVulnerabilityResult[]; total: number }>
  > {
    const result = await this.getServiceVulnerabilitiesUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      severity,
      search,
    });
    return createResponse(true, null, result);
  }

  // ── POST /vulnerabilities/:vulnerabilityId/view ────────────────────────────

  @ApiOperation({
    summary: 'Record that a vulnerability detail was viewed',
    description:
      'Logs a PACKAGE_VULN_VIEWED activity entry for the audit trail. ' +
      'Deliberately does not affect notification scheduling in any way — ' +
      'viewing a vulnerability never postpones or silences its digest alert, ' +
      'only an actual remediation action (version update, mute, snooze, removal) does.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiParam({
    name: 'vulnerabilityId',
    type: 'string',
    description: 'Vulnerability row id (uuid).',
  })
  @ApiResponseDecorator({
    status: 200,
    description: 'View recorded.',
    schema: apiResponseSchema({ type: 'null' }),
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
    description: 'Service or environment not found.',
  })
  @HttpCode(HttpStatus.OK)
  @Post(
    ':id/environments/:envId/services/:serviceId/vulnerabilities/:vulnerabilityId/view',
  )
  @UseGuards(CompanyAccessGuard)
  async logVulnerabilityView(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('vulnerabilityId') vulnerabilityId: string,
    @Req() req: Request,
  ): Promise<ApiResponse<null>> {
    await this.logVulnerabilityViewUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      vulnerabilityId,
      actingUserId: (req as any).user.sub,
    });
    return createResponse(true, null, null);
  }
}

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
  Body,
} from '@nestjs/common';
import { Request } from 'express';
import { RepositoryProvider } from '@aba/database';
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
  CreateRepositoryConnectionDto,
  CreateRepositoryConnectionDtoSchema,
} from '@/modules/repository-connection/dtos/CreateRepositoryConnectionDto';
import {
  UpdateRepositoryConnectionTriggerSettingsDto,
  UpdateRepositoryConnectionTriggerSettingsDtoSchema,
} from '@/modules/repository-connection/dtos/UpdateRepositoryConnectionTriggerSettingsDto';
import { CreateRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/createRepositoryConnection.usecase';
import { GetRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/getRepositoryConnection.usecase';
import { RotateRepositoryConnectionSecretUseCase } from '@/modules/repository-connection/usecases/rotateRepositoryConnectionSecret.usecase';
import { UpdateRepositoryConnectionTriggerSettingsUseCase } from '@/modules/repository-connection/usecases/updateRepositoryConnectionTriggerSettings.usecase';
import { DeleteRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/deleteRepositoryConnection.usecase';
import {
  RepositoryConnectionSecretReveal,
  RepositoryConnectionView,
} from '@/modules/repository-connection/services/repositoryConnection.service';

const connectionSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    provider: { type: 'string', enum: ['GITHUB', 'BITBUCKET'] },
    owner: { type: 'string' },
    name: { type: 'string' },
    watchedBranch: { type: 'string' },
    status: { type: 'string', enum: ['ACTIVE', 'PAUSED'] },
    lastPingedAt: { type: 'string', format: 'date-time', nullable: true },
    lastTriggeredAt: { type: 'string', format: 'date-time', nullable: true },
    triggerMode: { type: 'string', enum: ['INSTANT', 'PUSH_COUNT', 'TIME_INTERVAL'] },
    pushCountThreshold: { type: 'number', nullable: true },
    intervalDays: { type: 'number', nullable: true },
    pendingPushCount: { type: 'number' },
    serviceId: { type: 'number' },
    connectedById: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const secretRevealSchema = {
  type: 'object',
  properties: {
    connection: connectionSchema,
    webhookUrl: {
      type: 'string',
      description:
        'Paste this into GitHub: repo Settings -> Webhooks -> Add webhook -> Payload URL.',
      example: 'https://api.example.com/webhooks/github/9c1e...',
    },
    webhookSecret: {
      type: 'string',
      description:
        'Paste this into the same GitHub form as the "Secret". Shown only once ' +
        '- we store it encrypted and never return it again after this response.',
    },
  },
};

const WEBHOOK_PATH_BY_PROVIDER: Record<RepositoryProvider, string> = {
  [RepositoryProvider.GITHUB]: 'github',
  [RepositoryProvider.BITBUCKET]: 'bitbucket',
};

function buildWebhookUrl(
  req: Request,
  provider: RepositoryProvider,
  webhookToken: string,
): string {
  return `${req.protocol}://${req.get('host')}/webhooks/${WEBHOOK_PATH_BY_PROVIDER[provider]}/${webhookToken}`;
}

@ApiTags('Repository Connections')
@ApiBearerAuth()
@Controller('company')
@UseGuards(AuthGuard)
export class RepositoryConnectionController {
  constructor(
    private readonly createRepositoryConnectionUseCase: CreateRepositoryConnectionUseCase,
    private readonly getRepositoryConnectionUseCase: GetRepositoryConnectionUseCase,
    private readonly rotateRepositoryConnectionSecretUseCase: RotateRepositoryConnectionSecretUseCase,
    private readonly updateRepositoryConnectionTriggerSettingsUseCase: UpdateRepositoryConnectionTriggerSettingsUseCase,
    private readonly deleteRepositoryConnectionUseCase: DeleteRepositoryConnectionUseCase,
  ) {}

  // ── POST /repository-connection ────────────────────────────────────────────

  @ApiOperation({
    summary: 'Connect a GitHub or Bitbucket repository to a service',
    description:
      'Registers a repository+branch this service should be re-scanned on. We never ' +
      'read the repository’s code - no token is stored for GitHub API access. ' +
      'We only generate a webhook URL + secret for the customer to paste into their ' +
      'own GitHub repo settings; GitHub then pings us on push/release and we re-scan ' +
      'the packages already registered for this service. One connection per service. ' +
      'triggerMode/pushCountThreshold/intervalDays are optional - omit all three to get ' +
      'a computed default (INSTANT for a production-environment branch on any paid plan; ' +
      'otherwise the plan\'s configured default, or PUSH_COUNT/5 if the plan has none set). ' +
      'Restricted to BUSINESS_OWNER and BUSINESS_ADMIN.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['owner', 'name'],
      properties: {
        provider: {
          type: 'string',
          enum: ['GITHUB', 'BITBUCKET'],
          default: 'GITHUB',
          description:
            'Git host that will send the webhook. GITHUB gets a /webhooks/github/... URL, ' +
            'BITBUCKET (Bitbucket Cloud) a /webhooks/bitbucket/... URL.',
        },
        owner: { type: 'string', example: 'acme-corp' },
        name: { type: 'string', example: 'billing-api' },
        watchedBranch: { type: 'string', example: 'main', default: 'main' },
        triggerMode: {
          type: 'string',
          enum: ['INSTANT', 'PUSH_COUNT', 'TIME_INTERVAL'],
          description: 'Omit to compute a default. See operation description.',
        },
        pushCountThreshold: {
          type: 'number',
          description: 'Required if triggerMode is PUSH_COUNT.',
        },
        intervalDays: {
          type: 'number',
          description: 'Required if triggerMode is TIME_INTERVAL.',
        },
      },
    },
  })
  @ApiResponseDecorator({
    status: 201,
    description: 'Connection created. webhookSecret is shown only in this response.',
    schema: apiResponseSchema(secretRevealSchema),
  })
  @ApiResponseDecorator({ status: 400, description: 'Validation error.' })
  @ApiResponseDecorator({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponseDecorator({ status: 403, description: 'Caller is not a company manager, or the plan’s monitored-branch limit was reached.' })
  @ApiResponseDecorator({ status: 404, description: 'Service or environment not found.' })
  @ApiResponseDecorator({ status: 409, description: 'This service already has a connected repository.' })
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/environments/:envId/services/:serviceId/repository-connection')
  @UseGuards(CompanyManagerGuard)
  async create(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Body(new ZodValidationPipe(CreateRepositoryConnectionDto))
    dto: CreateRepositoryConnectionDtoSchema,
    @Req() req: Request,
  ): Promise<
    ApiResponse<{
      connection: RepositoryConnectionView;
      webhookUrl: string;
      webhookSecret: string;
    }>
  > {
    const result: RepositoryConnectionSecretReveal =
      await this.createRepositoryConnectionUseCase.execute({
        companyId,
        environmentId,
        serviceId,
        actingUserId: (req as any).user.sub,
        dto,
      });
    return createResponse(true, null, {
      connection: result.connection,
      webhookUrl: buildWebhookUrl(
        req,
        result.connection.provider,
        result.webhookToken,
      ),
      webhookSecret: result.webhookSecret,
    });
  }

  // ── GET /repository-connection ─────────────────────────────────────────────

  @ApiOperation({
    summary: 'Get repository connection status for a service',
    description:
      'Returns the connection’s status (owner/repo/branch/last ping/last trigger) ' +
      'without ever exposing the webhook secret. Returns data: null if no repository ' +
      'is connected. Any authenticated company member can read this.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Connection status, or null if not connected.',
    schema: apiResponseSchema({ ...connectionSchema, nullable: true }),
  })
  @ApiResponseDecorator({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponseDecorator({ status: 403, description: 'Caller does not belong to this company.' })
  @ApiResponseDecorator({ status: 404, description: 'Service or environment not found.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id/environments/:envId/services/:serviceId/repository-connection')
  @UseGuards(CompanyAccessGuard)
  async get(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
  ): Promise<ApiResponse<RepositoryConnectionView | null>> {
    const result = await this.getRepositoryConnectionUseCase.execute({
      companyId,
      environmentId,
      serviceId,
    });
    return createResponse(true, null, result);
  }

  // ── POST /repository-connection/rotate-secret ──────────────────────────────

  @ApiOperation({
    summary: 'Rotate the webhook secret for a connected repository',
    description:
      'Generates a new webhook URL + secret and invalidates the old one immediately - ' +
      'update the webhook in GitHub with the new values or deliveries will start ' +
      'failing signature verification. Restricted to BUSINESS_OWNER and BUSINESS_ADMIN.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Secret rotated. webhookSecret is shown only in this response.',
    schema: apiResponseSchema(secretRevealSchema),
  })
  @ApiResponseDecorator({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponseDecorator({ status: 403, description: 'Caller is not a company manager.' })
  @ApiResponseDecorator({ status: 404, description: 'Repository connection not found.' })
  @HttpCode(HttpStatus.OK)
  @Post(':id/environments/:envId/services/:serviceId/repository-connection/rotate-secret')
  @UseGuards(CompanyManagerGuard)
  async rotateSecret(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Req() req: Request,
  ): Promise<
    ApiResponse<{
      connection: RepositoryConnectionView;
      webhookUrl: string;
      webhookSecret: string;
    }>
  > {
    const result: RepositoryConnectionSecretReveal =
      await this.rotateRepositoryConnectionSecretUseCase.execute({
        companyId,
        environmentId,
        serviceId,
        actingUserId: (req as any).user.sub,
      });
    return createResponse(true, null, {
      connection: result.connection,
      webhookUrl: buildWebhookUrl(
        req,
        result.connection.provider,
        result.webhookToken,
      ),
      webhookSecret: result.webhookSecret,
    });
  }

  // ── PUT /repository-connection/trigger-settings ────────────────────────────

  @ApiOperation({
    summary: 'Update the scan trigger cadence for a connected repository',
    description:
      'Overrides the cadence computed at connect time — always available on any plan; ' +
      'the plan only decides what gets pre-filled when the connection is first created. ' +
      'INSTANT scans on every matching push/release. PUSH_COUNT batches until ' +
      'pushCountThreshold matching pushes have accumulated. TIME_INTERVAL only scans via ' +
      'the daily sweep, at most once every intervalDays, and only if at least one matching ' +
      'push arrived since the last scan. Restricted to BUSINESS_OWNER and BUSINESS_ADMIN.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['triggerMode'],
      properties: {
        triggerMode: { type: 'string', enum: ['INSTANT', 'PUSH_COUNT', 'TIME_INTERVAL'] },
        pushCountThreshold: {
          type: 'number',
          description: 'Required if triggerMode is PUSH_COUNT.',
        },
        intervalDays: {
          type: 'number',
          description: 'Required if triggerMode is TIME_INTERVAL.',
        },
      },
    },
  })
  @ApiResponseDecorator({
    status: 200,
    description: 'Cadence updated.',
    schema: apiResponseSchema(connectionSchema),
  })
  @ApiResponseDecorator({ status: 400, description: 'Validation error (e.g. missing threshold/interval for the chosen mode).' })
  @ApiResponseDecorator({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponseDecorator({ status: 403, description: 'Caller is not a company manager.' })
  @ApiResponseDecorator({ status: 404, description: 'Repository connection not found.' })
  @HttpCode(HttpStatus.OK)
  @Put(':id/environments/:envId/services/:serviceId/repository-connection/trigger-settings')
  @UseGuards(CompanyManagerGuard)
  async updateTriggerSettings(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Body(new ZodValidationPipe(UpdateRepositoryConnectionTriggerSettingsDto))
    dto: UpdateRepositoryConnectionTriggerSettingsDtoSchema,
    @Req() req: Request,
  ): Promise<ApiResponse<RepositoryConnectionView>> {
    const result = await this.updateRepositoryConnectionTriggerSettingsUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      actingUserId: (req as any).user.sub,
      dto,
    });
    return createResponse(true, null, result);
  }

  // ── DELETE /repository-connection ──────────────────────────────────────────

  @ApiOperation({
    summary: 'Disconnect a repository from a service',
    description:
      'Deletes the connection. GitHub will keep sending webhook deliveries to the old ' +
      'URL until the customer removes it on their side, but we will 404 them once ' +
      'deleted. Restricted to BUSINESS_OWNER and BUSINESS_ADMIN.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'envId', type: 'number', description: 'Environment id.' })
  @ApiParam({ name: 'serviceId', type: 'number', description: 'Service id.' })
  @ApiResponseDecorator({ status: 200, description: 'Connection deleted.', schema: apiResponseSchema({ type: 'null' }) })
  @ApiResponseDecorator({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponseDecorator({ status: 403, description: 'Caller is not a company manager.' })
  @ApiResponseDecorator({ status: 404, description: 'Repository connection not found.' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id/environments/:envId/services/:serviceId/repository-connection')
  @UseGuards(CompanyManagerGuard)
  async remove(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Req() req: Request,
  ): Promise<ApiResponse<null>> {
    await this.deleteRepositoryConnectionUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      actingUserId: (req as any).user.sub,
    });
    return createResponse(true, null, null);
  }
}

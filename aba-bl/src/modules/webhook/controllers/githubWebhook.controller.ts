import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import {
  ActivityEventType,
  RepositoryConnectionStatus,
  RepositoryProvider,
  RepositoryTriggerMode,
} from '@aba/database';
import { RepositoryConnectionRepository } from '@/modules/repository-connection/repositories/repositoryConnection.repository';
import { CryptoService } from '@/shared/security/crypto.service';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { PackageRescanSchedulerService } from '@/modules/scheduler/services/packageRescanScheduler.service';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';
import { verifyGithubWebhookSignature } from '@/modules/webhook/helpers/verifyGithubWebhookSignature';
import { createResponse } from '@/shared/utils/createResponse';
import { ApiResponse } from '@/shared/types/apiResponse';

interface GithubPushPayload {
  ref?: string;
}

interface GithubReleasePayload {
  action?: string;
}

/**
 * Public ingestion endpoint for GitHub webhook deliveries. Deliberately
 * outside AuthGuard/CompanyAccessGuard — GitHub can't send a Bearer token,
 * so the HMAC signature over the raw request body is the only
 * authentication. Also excluded from CSRF checks in main.ts (path prefix
 * '/webhooks/github/') for the same reason.
 *
 * We never read the customer's repository contents here or anywhere else —
 * a verified delivery only tells us "re-scan this service's already
 * -registered packages," reusing the exact same package.scan publish the
 * cron scheduler uses.
 */
@ApiExcludeController()
@Controller('webhooks/github')
export class GithubWebhookController {
  constructor(
    private readonly repositoryConnectionRepository: RepositoryConnectionRepository,
    private readonly cryptoService: CryptoService,
    private readonly serviceRepository: ServiceRepository,
    private readonly packageRescanSchedulerService: PackageRescanSchedulerService,
    private readonly activityLogRepository: ActivityLogRepository,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post(':webhookToken')
  async handle(
    @Param('webhookToken') webhookToken: string,
    @Headers('x-hub-signature-256') signatureHeader: string | undefined,
    @Headers('x-github-event') eventType: string | undefined,
    @Req() req: Request,
  ): Promise<ApiResponse<{ triggered: boolean }>> {
    const connection =
      await this.repositoryConnectionRepository.findByWebhookToken(
        webhookToken,
      );

    // Generic 404 whether the token is unknown or paused — don't reveal
    // which case it is to an unauthenticated caller.
    // A Bitbucket connection's token must never be honoured on the GitHub
    // path (and vice versa) — same generic 404.
    if (
      !connection ||
      connection.provider === RepositoryProvider.BITBUCKET ||
      connection.status === RepositoryConnectionStatus.PAUSED
    ) {
      throw new NotFoundException();
    }

    const secret = this.cryptoService.decrypt(connection.webhookSecretEnc);
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    const isValid = verifyGithubWebhookSignature(
      rawBody,
      signatureHeader,
      secret,
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    if (eventType === 'ping') {
      await this.repositoryConnectionRepository.recordDelivery(
        connection.id,
        { triggered: false },
      );
      return createResponse(true, null, { triggered: false });
    }

    const body = req.body as GithubPushPayload & GithubReleasePayload;
    const matches =
      (eventType === 'push' &&
        body?.ref === `refs/heads/${connection.watchedBranch}`) ||
      (eventType === 'release' && body?.action === 'published');

    if (!matches) {
      await this.repositoryConnectionRepository.recordDelivery(
        connection.id,
        { triggered: false },
      );
      return createResponse(true, null, { triggered: false });
    }

    const newPendingCount = connection.pendingPushCount + 1;

    // INSTANT always fires. PUSH_COUNT fires once the accumulated count
    // reaches the threshold. TIME_INTERVAL never fires from the webhook
    // itself — it only accumulates pendingPushCount here; the daily
    // RepositoryTriggerSweepService decides when it's actually due.
    const shouldTriggerNow =
      connection.triggerMode === RepositoryTriggerMode.INSTANT ||
      (connection.triggerMode === RepositoryTriggerMode.PUSH_COUNT &&
        newPendingCount >= (connection.pushCountThreshold ?? 1));

    if (!shouldTriggerNow) {
      await this.repositoryConnectionRepository.recordDelivery(
        connection.id,
        { triggered: false, pendingPushCount: newPendingCount },
      );
      return createResponse(true, null, { triggered: false });
    }

    const service = await this.serviceRepository.findByIdWithActivePackages(
      connection.serviceId,
    );

    if (service) {
      await this.packageRescanSchedulerService.publishScanForService(service);
      await this.activityLogRepository.create({
        eventType: ActivityEventType.REPOSITORY_SCAN_TRIGGERED,
        companyId: service.companyId,
        environmentId: service.environmentId,
        serviceId: service.id,
        metadata: {
          via: eventType,
          branch: connection.watchedBranch,
          triggerMode: connection.triggerMode,
        },
      });
    }

    await this.repositoryConnectionRepository.recordDelivery(connection.id, {
      triggered: true,
    });

    return createResponse(true, null, { triggered: true });
  }
}

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

interface BitbucketPushPayload {
  push?: {
    changes?: {
      new?: { type?: string; name?: string } | null;
    }[];
  };
}

/**
 * Public ingestion endpoint for Bitbucket Cloud webhook deliveries.
 * Mirrors GithubWebhookController: outside AuthGuard (Bitbucket can't send
 * a Bearer token) and excluded from CSRF in main.ts, so the HMAC signature
 * over the raw body is the only authentication.
 *
 * Bitbucket Cloud signs the body with HMAC-SHA256 when a webhook secret is
 * set and sends it as `X-Hub-Signature: sha256=<hex>` — the same wire format
 * GitHub uses in `X-Hub-Signature-256`, so the same verifier is reused.
 *
 * We never read the customer's repository contents — a verified `repo:push`
 * to the watched branch only means "re-scan this service's already
 * -registered packages", via the same package.scan publish as every other
 * trigger. Bitbucket has no "release published" event, so only pushes count.
 */
@ApiExcludeController()
@Controller('webhooks/bitbucket')
export class BitbucketWebhookController {
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
    @Headers('x-hub-signature') signatureHeader: string | undefined,
    @Headers('x-event-key') eventKey: string | undefined,
    @Req() req: Request,
  ): Promise<ApiResponse<{ triggered: boolean }>> {
    const connection =
      await this.repositoryConnectionRepository.findByWebhookToken(
        webhookToken,
      );

    // Generic 404 for unknown, paused, or not-a-Bitbucket tokens — don't
    // reveal which case it is to an unauthenticated caller.
    if (
      !connection ||
      connection.provider !== RepositoryProvider.BITBUCKET ||
      connection.status === RepositoryConnectionStatus.PAUSED
    ) {
      throw new NotFoundException();
    }

    const secret = this.cryptoService.decrypt(connection.webhookSecretEnc);
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;
    if (!verifyGithubWebhookSignature(rawBody, signatureHeader, secret)) {
      throw new UnauthorizedException('Invalid webhook signature.');
    }

    if (eventKey === 'diagnostics:ping') {
      await this.repositoryConnectionRepository.recordDelivery(
        connection.id,
        { triggered: false },
      );
      return createResponse(true, null, { triggered: false });
    }

    const body = req.body as BitbucketPushPayload;
    // A single push can update several refs; any change to the watched
    // branch (not a tag, not a deleted branch where `new` is null) counts.
    const matches =
      eventKey === 'repo:push' &&
      (body?.push?.changes ?? []).some(
        (change) =>
          change?.new?.type === 'branch' &&
          change.new.name === connection.watchedBranch,
      );

    if (!matches) {
      await this.repositoryConnectionRepository.recordDelivery(
        connection.id,
        { triggered: false },
      );
      return createResponse(true, null, { triggered: false });
    }

    const newPendingCount = connection.pendingPushCount + 1;

    // INSTANT always fires. PUSH_COUNT fires once the accumulated count
    // reaches the threshold. TIME_INTERVAL only accumulates here; the daily
    // RepositoryTriggerSweepService decides when it is due.
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
          provider: RepositoryProvider.BITBUCKET,
          via: eventKey,
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

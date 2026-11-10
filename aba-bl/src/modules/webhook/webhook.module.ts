import { Module } from '@nestjs/common';
import { GithubWebhookController } from '@/modules/webhook/controllers/githubWebhook.controller';
import { BitbucketWebhookController } from '@/modules/webhook/controllers/bitbucketWebhook.controller';
import { RepositoryConnectionRepository } from '@/modules/repository-connection/repositories/repositoryConnection.repository';
import { CryptoService } from '@/shared/security/crypto.service';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';
import { SchedulerModule } from '@/modules/scheduler/scheduler.module';

@Module({
  // SchedulerModule (not a locally-provided PackageRescanSchedulerService)
  // so we reuse its single @Cron-registered instance rather than
  // instantiating a second one, which would double-register the cron tick.
  imports: [SchedulerModule],
  controllers: [GithubWebhookController, BitbucketWebhookController],
  providers: [
    RepositoryConnectionRepository,
    CryptoService,
    ServiceRepository,
    ActivityLogRepository,
  ],
})
export class WebhookModule {}

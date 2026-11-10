import { Module } from '@nestjs/common';
import { PackageRescanSchedulerService } from '@/modules/scheduler/services/packageRescanScheduler.service';
import { RepositoryTriggerSweepService } from '@/modules/scheduler/services/repositoryTriggerSweep.service';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { RepositoryConnectionRepository } from '@/modules/repository-connection/repositories/repositoryConnection.repository';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';

@Module({
  providers: [
    PackageRescanSchedulerService,
    RepositoryTriggerSweepService,
    ServiceRepository,
    RepositoryConnectionRepository,
    ActivityLogRepository,
  ],
  exports: [PackageRescanSchedulerService],
})
export class SchedulerModule {}

import { Module } from '@nestjs/common';
import { ServicePackageController } from '@/modules/service-package/controllers/servicePackage.controller';
import { PackageRepository } from '@/modules/service-package/repositories/package.repository';
import { ServicePackageRepository } from '@/modules/service-package/repositories/servicePackage.repository';
import { ServicePackageNotificationStateRepository } from '@/modules/service-package/repositories/servicePackageNotificationState.repository';
import { VulnerabilityRepository } from '@/modules/service-package/repositories/vulnerability.repository';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';
import { OsvService } from '@/modules/service-package/services/osv.service';
import { VulnerabilityScanService } from '@/modules/service-package/services/vulnerability-scan.service';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';
import { GetServicePackagesUseCase } from '@/modules/service-package/usecases/getServicePackages.usecase';
import { GetServicePackageHistoryUseCase } from '@/modules/service-package/usecases/getServicePackageHistory.usecase';
import { CreateServicePackageUseCase } from '@/modules/service-package/usecases/createServicePackage.usecase';
import { UpdateServicePackageUseCase } from '@/modules/service-package/usecases/updateServicePackage.usecase';
import { DeleteServicePackageUseCase } from '@/modules/service-package/usecases/deleteServicePackage.usecase';
import { BulkImportServicePackagesUseCase } from '@/modules/service-package/usecases/bulkImportServicePackages.usecase';
import { GetServiceVulnerabilitiesUseCase } from '@/modules/service-package/usecases/getServiceVulnerabilities.usecase';
import { UpdateServicePackageNotificationUseCase } from '@/modules/service-package/usecases/updateServicePackageNotification.usecase';
import { LogVulnerabilityViewUseCase } from '@/modules/service-package/usecases/logVulnerabilityView.usecase';
import { VulnerabilityFetchedConsumerService } from '@/modules/service-package/consumers/vulnerabilityFetchedConsumer.service';

@Module({
  controllers: [ServicePackageController],
  providers: [
    PackageRepository,
    ServicePackageRepository,
    ServicePackageNotificationStateRepository,
    VulnerabilityRepository,
    ServicePackageService,
    OsvService,
    VulnerabilityScanService,
    ServiceRepository,
    EnvironmentRepository,
    ActivityLogRepository,
    GetServicePackagesUseCase,
    GetServicePackageHistoryUseCase,
    CreateServicePackageUseCase,
    UpdateServicePackageUseCase,
    DeleteServicePackageUseCase,
    BulkImportServicePackagesUseCase,
    GetServiceVulnerabilitiesUseCase,
    UpdateServicePackageNotificationUseCase,
    LogVulnerabilityViewUseCase,
    VulnerabilityFetchedConsumerService,
  ],
})
export class ServicePackageModule {}

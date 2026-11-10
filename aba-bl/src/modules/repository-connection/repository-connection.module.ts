import { Module } from '@nestjs/common';
import { RepositoryConnectionController } from '@/modules/repository-connection/controllers/repositoryConnection.controller';
import { RepositoryConnectionRepository } from '@/modules/repository-connection/repositories/repositoryConnection.repository';
import { RepositoryConnectionService } from '@/modules/repository-connection/services/repositoryConnection.service';
import { CreateRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/createRepositoryConnection.usecase';
import { GetRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/getRepositoryConnection.usecase';
import { RotateRepositoryConnectionSecretUseCase } from '@/modules/repository-connection/usecases/rotateRepositoryConnectionSecret.usecase';
import { UpdateRepositoryConnectionTriggerSettingsUseCase } from '@/modules/repository-connection/usecases/updateRepositoryConnectionTriggerSettings.usecase';
import { DeleteRepositoryConnectionUseCase } from '@/modules/repository-connection/usecases/deleteRepositoryConnection.usecase';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';
import { CryptoService } from '@/shared/security/crypto.service';

@Module({
  controllers: [RepositoryConnectionController],
  providers: [
    RepositoryConnectionRepository,
    RepositoryConnectionService,
    CreateRepositoryConnectionUseCase,
    GetRepositoryConnectionUseCase,
    RotateRepositoryConnectionSecretUseCase,
    UpdateRepositoryConnectionTriggerSettingsUseCase,
    DeleteRepositoryConnectionUseCase,
    ServiceRepository,
    EnvironmentRepository,
    CompanyRepository,
    ActivityLogRepository,
    CryptoService,
  ],
})
export class RepositoryConnectionModule {}

import { Module } from '@nestjs/common';
import { TestRunController } from '@/modules/test-run/controllers/testRun.controller';
import { InternalTestRunController } from '@/modules/test-run/controllers/internalTestRun.controller';
import { TestRunRepository } from '@/modules/test-run/repositories/testRun.repository';
import { TestResultRepository } from '@/modules/test-run/repositories/testResult.repository';
import { TestRunService } from '@/modules/test-run/services/testRun.service';
import { TestScheduledProducerService } from '@/modules/test-run/services/testScheduledProducer.service';
import { TestResultConsumerService } from '@/modules/test-run/consumers/testResultConsumer.service';
import { TestPageRepository } from '@/modules/test-page/repositories/testPage.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { CryptoService } from '@/shared/security/crypto.service';
import { CreateTestRunUseCase } from '@/modules/test-run/usecases/createTestRun.usecase';
import { GetTestRunsUseCase } from '@/modules/test-run/usecases/getTestRuns.usecase';
import { GetTestRunByIdUseCase } from '@/modules/test-run/usecases/getTestRunById.usecase';
import { GetTestRunMaterialsUseCase } from '@/modules/test-run/usecases/getTestRunMaterials.usecase';

@Module({
  controllers: [TestRunController, InternalTestRunController],
  providers: [
    TestRunRepository,
    TestResultRepository,
    TestRunService,
    TestScheduledProducerService,
    TestResultConsumerService,
    TestPageRepository,
    ServiceRepository,
    EnvironmentRepository,
    CompanyRepository,
    CryptoService,
    CreateTestRunUseCase,
    GetTestRunsUseCase,
    GetTestRunByIdUseCase,
    GetTestRunMaterialsUseCase,
  ],
})
export class TestRunModule {}

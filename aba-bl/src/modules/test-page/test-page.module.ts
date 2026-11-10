import { Module } from '@nestjs/common';
import { TestPageController } from '@/modules/test-page/controllers/testPage.controller';
import { TestPageRepository } from '@/modules/test-page/repositories/testPage.repository';
import { TestPageService } from '@/modules/test-page/services/testPage.service';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { CryptoService } from '@/shared/security/crypto.service';
import { CreateTestPageUseCase } from '@/modules/test-page/usecases/createTestPage.usecase';
import { GetTestPagesUseCase } from '@/modules/test-page/usecases/getTestPages.usecase';
import { GetTestPageByIdUseCase } from '@/modules/test-page/usecases/getTestPageById.usecase';
import { UpdateTestPageUseCase } from '@/modules/test-page/usecases/updateTestPage.usecase';
import { DeleteTestPageUseCase } from '@/modules/test-page/usecases/deleteTestPage.usecase';

@Module({
  controllers: [TestPageController],
  providers: [
    TestPageRepository,
    TestPageService,
    ServiceRepository,
    EnvironmentRepository,
    CompanyRepository,
    CryptoService,
    CreateTestPageUseCase,
    GetTestPagesUseCase,
    GetTestPageByIdUseCase,
    UpdateTestPageUseCase,
    DeleteTestPageUseCase,
  ],
})
export class TestPageModule {}

import { Module } from '@nestjs/common';
import { TestDefinitionController } from '@/modules/test-definition/controllers/testDefinition.controller';
import { TestDefinitionRepository } from '@/modules/test-definition/repositories/testDefinition.repository';
import { TestDefinitionService } from '@/modules/test-definition/services/testDefinition.service';
import { TestPageRepository } from '@/modules/test-page/repositories/testPage.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { CreateTestDefinitionUseCase } from '@/modules/test-definition/usecases/createTestDefinition.usecase';
import { CloneTestDefinitionUseCase } from '@/modules/test-definition/usecases/cloneTestDefinition.usecase';
import { GetTestDefinitionsUseCase } from '@/modules/test-definition/usecases/getTestDefinitions.usecase';
import { UpdateTestDefinitionUseCase } from '@/modules/test-definition/usecases/updateTestDefinition.usecase';
import { DeleteTestDefinitionUseCase } from '@/modules/test-definition/usecases/deleteTestDefinition.usecase';

@Module({
  controllers: [TestDefinitionController],
  providers: [
    TestDefinitionRepository,
    TestDefinitionService,
    TestPageRepository,
    ServiceRepository,
    EnvironmentRepository,
    CompanyRepository,
    CreateTestDefinitionUseCase,
    CloneTestDefinitionUseCase,
    GetTestDefinitionsUseCase,
    UpdateTestDefinitionUseCase,
    DeleteTestDefinitionUseCase,
  ],
})
export class TestDefinitionModule {}

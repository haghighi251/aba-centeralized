import { Module } from '@nestjs/common';
import { EnvironmentController } from '@/modules/environment/controllers/environment.controller';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { EnvironmentService } from '@/modules/environment/services/environment.service';
import { TeamRepository } from '@/modules/team/repositories/team.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { CreateEnvironmentUseCase } from '@/modules/environment/usecases/createEnvironment.usecase';
import { GetEnvironmentsUseCase } from '@/modules/environment/usecases/getEnvironments.usecase';
import { GetEnvironmentByIdUseCase } from '@/modules/environment/usecases/getEnvironmentById.usecase';
import { UpdateEnvironmentUseCase } from '@/modules/environment/usecases/updateEnvironment.usecase';
import { DeleteEnvironmentUseCase } from '@/modules/environment/usecases/deleteEnvironment.usecase';

@Module({
  controllers: [EnvironmentController],
  providers: [
    EnvironmentRepository,
    EnvironmentService,
    TeamRepository,
    CompanyRepository,
    CreateEnvironmentUseCase,
    GetEnvironmentsUseCase,
    GetEnvironmentByIdUseCase,
    UpdateEnvironmentUseCase,
    DeleteEnvironmentUseCase,
  ],
})
export class EnvironmentModule {}

import { Module } from '@nestjs/common';
import { ServiceController } from '@/modules/service/controllers/service.controller';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { ServiceService } from '@/modules/service/services/service.service';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { CreateServiceUseCase } from '@/modules/service/usecases/createService.usecase';
import { GetServicesUseCase } from '@/modules/service/usecases/getServices.usecase';
import { GetServiceByIdUseCase } from '@/modules/service/usecases/getServiceById.usecase';
import { UpdateServiceUseCase } from '@/modules/service/usecases/updateService.usecase';
import { DeleteServiceUseCase } from '@/modules/service/usecases/deleteService.usecase';

@Module({
  controllers: [ServiceController],
  providers: [
    ServiceRepository,
    ServiceService,
    EnvironmentRepository,
    CompanyRepository,
    CreateServiceUseCase,
    GetServicesUseCase,
    GetServiceByIdUseCase,
    UpdateServiceUseCase,
    DeleteServiceUseCase,
  ],
})
export class ServiceModule {}

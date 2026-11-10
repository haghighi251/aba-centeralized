import { Injectable } from '@nestjs/common';
import { Service } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { ServiceService } from '@/modules/service/services/service.service';
import { CreateServiceDtoSchema } from '@/modules/service/dtos/CreateServiceDto';

export type TCreateServiceRequest = {
  companyId: number;
  environmentId: number;
  dto: CreateServiceDtoSchema;
};

@Injectable()
export class CreateServiceUseCase implements UseCase<
  TCreateServiceRequest,
  Service
> {
  constructor(private readonly serviceService: ServiceService) {}

  async execute(request: TCreateServiceRequest): Promise<Service> {
    const result = await this.serviceService.createService(
      request.companyId,
      request.environmentId,
      request.dto,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

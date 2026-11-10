import { Injectable } from '@nestjs/common';
import { Service } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { ServiceService } from '@/modules/service/services/service.service';
import { UpdateServiceDtoSchema } from '@/modules/service/dtos/UpdateServiceDto';

export type TUpdateServiceRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  dto: UpdateServiceDtoSchema;
};

@Injectable()
export class UpdateServiceUseCase implements UseCase<
  TUpdateServiceRequest,
  Service
> {
  constructor(private readonly serviceService: ServiceService) {}

  async execute(request: TUpdateServiceRequest): Promise<Service> {
    const result = await this.serviceService.updateService(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.dto,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

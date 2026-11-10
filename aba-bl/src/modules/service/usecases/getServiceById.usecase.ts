import { Injectable } from '@nestjs/common';
import { Service } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { ServiceService } from '@/modules/service/services/service.service';

export type TGetServiceByIdRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
};

@Injectable()
export class GetServiceByIdUseCase implements UseCase<
  TGetServiceByIdRequest,
  Service
> {
  constructor(private readonly serviceService: ServiceService) {}

  async execute(request: TGetServiceByIdRequest): Promise<Service> {
    const result = await this.serviceService.getServiceById(
      request.companyId,
      request.environmentId,
      request.serviceId,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

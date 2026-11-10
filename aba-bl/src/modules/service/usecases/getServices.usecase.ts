import { Injectable } from '@nestjs/common';
import { Service } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { ServiceService } from '@/modules/service/services/service.service';
import { TServiceFilter } from '@/modules/service/dtos/serviceFilter';

@Injectable()
export class GetServicesUseCase implements UseCase<
  TServiceFilter,
  { data: Service[]; total: number }
> {
  constructor(private readonly serviceService: ServiceService) {}

  async execute(
    filter: TServiceFilter,
  ): Promise<{ data: Service[]; total: number }> {
    const result = await this.serviceService.getServices(filter);

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';
import { ServicePackageWithPackage } from '@/modules/service-package/repositories/servicePackage.repository';
import { CreateServicePackageDtoSchema } from '@/modules/service-package/dtos/CreateServicePackageDto';

export type TCreateServicePackageRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  actingUserId: number;
  dto: CreateServicePackageDtoSchema;
};

@Injectable()
export class CreateServicePackageUseCase implements UseCase<
  TCreateServicePackageRequest,
  ServicePackageWithPackage
> {
  constructor(private readonly servicePackageService: ServicePackageService) {}

  async execute(
    request: TCreateServicePackageRequest,
  ): Promise<ServicePackageWithPackage> {
    const result = await this.servicePackageService.createPackage(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.actingUserId,
      request.dto,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';
import { ServicePackageWithPackage } from '@/modules/service-package/repositories/servicePackage.repository';
import { UpdateServicePackageDtoSchema } from '@/modules/service-package/dtos/UpdateServicePackageDto';

export type TUpdateServicePackageRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  servicePackageId: number;
  actingUserId: number;
  dto: UpdateServicePackageDtoSchema;
};

@Injectable()
export class UpdateServicePackageUseCase implements UseCase<
  TUpdateServicePackageRequest,
  ServicePackageWithPackage
> {
  constructor(private readonly servicePackageService: ServicePackageService) {}

  async execute(
    request: TUpdateServicePackageRequest,
  ): Promise<ServicePackageWithPackage> {
    const result = await this.servicePackageService.updatePackage(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.servicePackageId,
      request.actingUserId,
      request.dto,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

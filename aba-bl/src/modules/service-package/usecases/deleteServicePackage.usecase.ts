import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';
import { ServicePackageWithPackage } from '@/modules/service-package/repositories/servicePackage.repository';

export type TDeleteServicePackageRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  servicePackageId: number;
  actingUserId: number;
};

@Injectable()
export class DeleteServicePackageUseCase implements UseCase<
  TDeleteServicePackageRequest,
  ServicePackageWithPackage
> {
  constructor(private readonly servicePackageService: ServicePackageService) {}

  async execute(
    request: TDeleteServicePackageRequest,
  ): Promise<ServicePackageWithPackage> {
    const result = await this.servicePackageService.removePackage(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.servicePackageId,
      request.actingUserId,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

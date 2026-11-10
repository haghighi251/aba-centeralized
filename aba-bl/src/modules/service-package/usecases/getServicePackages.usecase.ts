import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';
import { ServicePackageWithPackage } from '@/modules/service-package/repositories/servicePackage.repository';
import { TServicePackageFilter } from '@/modules/service-package/dtos/servicePackageFilter';

@Injectable()
export class GetServicePackagesUseCase implements UseCase<
  TServicePackageFilter,
  { data: ServicePackageWithPackage[]; total: number }
> {
  constructor(private readonly servicePackageService: ServicePackageService) {}

  async execute(
    request: TServicePackageFilter,
  ): Promise<{ data: ServicePackageWithPackage[]; total: number }> {
    const result = await this.servicePackageService.getActivePackages(request);
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

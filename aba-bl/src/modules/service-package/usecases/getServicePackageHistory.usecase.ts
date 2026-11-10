import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';
import { ServicePackageWithPackage } from '@/modules/service-package/repositories/servicePackage.repository';
import { TServicePackageHistoryFilter } from '@/modules/service-package/dtos/servicePackageFilter';

@Injectable()
export class GetServicePackageHistoryUseCase implements UseCase<
  TServicePackageHistoryFilter,
  { data: ServicePackageWithPackage[]; total: number }
> {
  constructor(private readonly servicePackageService: ServicePackageService) {}

  async execute(
    request: TServicePackageHistoryFilter,
  ): Promise<{ data: ServicePackageWithPackage[]; total: number }> {
    const result = await this.servicePackageService.getPackageHistory(request);
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

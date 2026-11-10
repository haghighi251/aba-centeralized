import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import {
  ServicePackageService,
  BulkImportResult,
} from '@/modules/service-package/services/servicePackage.service';
import { BulkImportServicePackagesDtoSchema } from '@/modules/service-package/dtos/BulkImportServicePackagesDto';

export type TBulkImportServicePackagesRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  actingUserId: number;
  dto: BulkImportServicePackagesDtoSchema;
};

@Injectable()
export class BulkImportServicePackagesUseCase implements UseCase<
  TBulkImportServicePackagesRequest,
  BulkImportResult
> {
  constructor(private readonly servicePackageService: ServicePackageService) {}

  async execute(
    request: TBulkImportServicePackagesRequest,
  ): Promise<BulkImportResult> {
    const result = await this.servicePackageService.bulkImport(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.actingUserId,
      request.dto.ecosystem,
      request.dto.packages,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

import { Injectable } from '@nestjs/common';
import { ServicePackageNotificationState } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';
import { UpdateServicePackageNotificationDtoSchema } from '@/modules/service-package/dtos/UpdateServicePackageNotificationDto';

export type TUpdateServicePackageNotificationRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  servicePackageId: number;
  actingUserId: number;
  dto: UpdateServicePackageNotificationDtoSchema;
};

@Injectable()
export class UpdateServicePackageNotificationUseCase implements UseCase<
  TUpdateServicePackageNotificationRequest,
  ServicePackageNotificationState
> {
  constructor(private readonly servicePackageService: ServicePackageService) {}

  async execute(
    request: TUpdateServicePackageNotificationRequest,
  ): Promise<ServicePackageNotificationState> {
    const result =
      await this.servicePackageService.updateNotificationPreference(
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

import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import {
  RepositoryConnectionService,
  RepositoryConnectionView,
} from '@/modules/repository-connection/services/repositoryConnection.service';
import { UpdateRepositoryConnectionTriggerSettingsDtoSchema } from '@/modules/repository-connection/dtos/UpdateRepositoryConnectionTriggerSettingsDto';

export type TUpdateRepositoryConnectionTriggerSettingsRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  actingUserId: number;
  dto: UpdateRepositoryConnectionTriggerSettingsDtoSchema;
};

@Injectable()
export class UpdateRepositoryConnectionTriggerSettingsUseCase
  implements
    UseCase<TUpdateRepositoryConnectionTriggerSettingsRequest, RepositoryConnectionView>
{
  constructor(
    private readonly repositoryConnectionService: RepositoryConnectionService,
  ) {}

  async execute(
    request: TUpdateRepositoryConnectionTriggerSettingsRequest,
  ): Promise<RepositoryConnectionView> {
    const result = await this.repositoryConnectionService.updateTriggerSettings(
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

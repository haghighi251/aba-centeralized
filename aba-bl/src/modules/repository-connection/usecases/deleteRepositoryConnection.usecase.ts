import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { RepositoryConnectionService } from '@/modules/repository-connection/services/repositoryConnection.service';

export type TDeleteRepositoryConnectionRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  actingUserId: number;
};

@Injectable()
export class DeleteRepositoryConnectionUseCase
  implements UseCase<TDeleteRepositoryConnectionRequest, null>
{
  constructor(
    private readonly repositoryConnectionService: RepositoryConnectionService,
  ) {}

  async execute(
    request: TDeleteRepositoryConnectionRequest,
  ): Promise<null> {
    const result = await this.repositoryConnectionService.remove(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.actingUserId,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

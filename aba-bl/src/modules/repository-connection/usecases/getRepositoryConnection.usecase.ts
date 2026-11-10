import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import {
  RepositoryConnectionService,
  RepositoryConnectionView,
} from '@/modules/repository-connection/services/repositoryConnection.service';

export type TGetRepositoryConnectionRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
};

@Injectable()
export class GetRepositoryConnectionUseCase
  implements
    UseCase<TGetRepositoryConnectionRequest, RepositoryConnectionView | null>
{
  constructor(
    private readonly repositoryConnectionService: RepositoryConnectionService,
  ) {}

  async execute(
    request: TGetRepositoryConnectionRequest,
  ): Promise<RepositoryConnectionView | null> {
    const result = await this.repositoryConnectionService.get(
      request.companyId,
      request.environmentId,
      request.serviceId,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

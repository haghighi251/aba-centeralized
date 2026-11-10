import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import {
  RepositoryConnectionSecretReveal,
  RepositoryConnectionService,
} from '@/modules/repository-connection/services/repositoryConnection.service';

export type TRotateRepositoryConnectionSecretRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  actingUserId: number;
};

@Injectable()
export class RotateRepositoryConnectionSecretUseCase
  implements
    UseCase<
      TRotateRepositoryConnectionSecretRequest,
      RepositoryConnectionSecretReveal
    >
{
  constructor(
    private readonly repositoryConnectionService: RepositoryConnectionService,
  ) {}

  async execute(
    request: TRotateRepositoryConnectionSecretRequest,
  ): Promise<RepositoryConnectionSecretReveal> {
    const result = await this.repositoryConnectionService.rotateSecret(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.actingUserId,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

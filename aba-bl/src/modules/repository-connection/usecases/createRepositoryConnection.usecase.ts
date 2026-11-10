import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import {
  RepositoryConnectionSecretReveal,
  RepositoryConnectionService,
} from '@/modules/repository-connection/services/repositoryConnection.service';
import { CreateRepositoryConnectionDtoSchema } from '@/modules/repository-connection/dtos/CreateRepositoryConnectionDto';

export type TCreateRepositoryConnectionRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  actingUserId: number;
  dto: CreateRepositoryConnectionDtoSchema;
};

@Injectable()
export class CreateRepositoryConnectionUseCase
  implements
    UseCase<TCreateRepositoryConnectionRequest, RepositoryConnectionSecretReveal>
{
  constructor(
    private readonly repositoryConnectionService: RepositoryConnectionService,
  ) {}

  async execute(
    request: TCreateRepositoryConnectionRequest,
  ): Promise<RepositoryConnectionSecretReveal> {
    const result = await this.repositoryConnectionService.create(
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

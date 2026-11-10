import { Injectable } from '@nestjs/common';
import { Environment } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { EnvironmentService } from '@/modules/environment/services/environment.service';

export type TDeleteEnvironmentRequest = {
  companyId: number;
  environmentId: number;
};

@Injectable()
export class DeleteEnvironmentUseCase implements UseCase<
  TDeleteEnvironmentRequest,
  Environment
> {
  constructor(private readonly environmentService: EnvironmentService) {}

  async execute(request: TDeleteEnvironmentRequest): Promise<Environment> {
    const result = await this.environmentService.deleteEnvironment(
      request.companyId,
      request.environmentId,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

import { Injectable } from '@nestjs/common';
import { Environment } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { EnvironmentService } from '@/modules/environment/services/environment.service';

export type TGetEnvironmentByIdRequest = {
  companyId: number;
  environmentId: number;
};

@Injectable()
export class GetEnvironmentByIdUseCase implements UseCase<
  TGetEnvironmentByIdRequest,
  Environment
> {
  constructor(private readonly environmentService: EnvironmentService) {}

  async execute(request: TGetEnvironmentByIdRequest): Promise<Environment> {
    const result = await this.environmentService.getEnvironmentById(
      request.companyId,
      request.environmentId,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

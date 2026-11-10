import { Injectable } from '@nestjs/common';
import { Environment } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { EnvironmentService } from '@/modules/environment/services/environment.service';
import { CreateEnvironmentDtoSchema } from '@/modules/environment/dtos/CreateEnvironmentDto';

export type TCreateEnvironmentRequest = {
  companyId: number;
  dto: CreateEnvironmentDtoSchema;
};

@Injectable()
export class CreateEnvironmentUseCase implements UseCase<
  TCreateEnvironmentRequest,
  Environment
> {
  constructor(private readonly environmentService: EnvironmentService) {}

  async execute(request: TCreateEnvironmentRequest): Promise<Environment> {
    const result = await this.environmentService.createEnvironment(
      request.companyId,
      request.dto,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

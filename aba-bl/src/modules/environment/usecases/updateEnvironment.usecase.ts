import { Injectable } from '@nestjs/common';
import { Environment } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { EnvironmentService } from '@/modules/environment/services/environment.service';
import { UpdateEnvironmentDtoSchema } from '@/modules/environment/dtos/UpdateEnvironmentDto';

export type TUpdateEnvironmentRequest = {
  companyId: number;
  environmentId: number;
  dto: UpdateEnvironmentDtoSchema;
};

@Injectable()
export class UpdateEnvironmentUseCase implements UseCase<
  TUpdateEnvironmentRequest,
  Environment
> {
  constructor(private readonly environmentService: EnvironmentService) {}

  async execute(request: TUpdateEnvironmentRequest): Promise<Environment> {
    const result = await this.environmentService.updateEnvironment(
      request.companyId,
      request.environmentId,
      request.dto,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

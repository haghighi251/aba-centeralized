import { Injectable } from '@nestjs/common';
import { TestDefinition } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { TestDefinitionService } from '@/modules/test-definition/services/testDefinition.service';
import { UpdateTestDefinitionDtoSchema } from '@/modules/test-definition/dtos/UpdateTestDefinitionDto';

export type TUpdateTestDefinitionRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  targetId: number;
  definitionId: number;
  dto: UpdateTestDefinitionDtoSchema;
};

@Injectable()
export class UpdateTestDefinitionUseCase
  implements UseCase<TUpdateTestDefinitionRequest, TestDefinition>
{
  constructor(private readonly testDefinitionService: TestDefinitionService) {}

  async execute(
    request: TUpdateTestDefinitionRequest,
  ): Promise<TestDefinition> {
    const result = await this.testDefinitionService.updateDefinition(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.targetId,
      request.definitionId,
      request.dto,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

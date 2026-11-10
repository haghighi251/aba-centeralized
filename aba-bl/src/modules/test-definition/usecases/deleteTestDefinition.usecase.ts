import { Injectable } from '@nestjs/common';
import { TestDefinition } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { TestDefinitionService } from '@/modules/test-definition/services/testDefinition.service';

export type TDeleteTestDefinitionRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  targetId: number;
  definitionId: number;
};

@Injectable()
export class DeleteTestDefinitionUseCase
  implements UseCase<TDeleteTestDefinitionRequest, TestDefinition>
{
  constructor(private readonly testDefinitionService: TestDefinitionService) {}

  async execute(
    request: TDeleteTestDefinitionRequest,
  ): Promise<TestDefinition> {
    const result = await this.testDefinitionService.deleteDefinition(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.targetId,
      request.definitionId,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

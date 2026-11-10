import { Injectable } from '@nestjs/common';
import { TestDefinition } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { TestDefinitionService } from '@/modules/test-definition/services/testDefinition.service';

export type TGetTestDefinitionsRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  targetId: number;
};

@Injectable()
export class GetTestDefinitionsUseCase
  implements
    UseCase<
      TGetTestDefinitionsRequest,
      { data: TestDefinition[]; total: number }
    >
{
  constructor(private readonly testDefinitionService: TestDefinitionService) {}

  async execute(
    request: TGetTestDefinitionsRequest,
  ): Promise<{ data: TestDefinition[]; total: number }> {
    const result = await this.testDefinitionService.listDefinitions(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.targetId,
    );
    if (result.isErr()) throw result.error;
    return { data: result.value, total: result.value.length };
  }
}

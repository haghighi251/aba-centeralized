import { Injectable } from '@nestjs/common';
import { TestDefinition } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { TestDefinitionService } from '@/modules/test-definition/services/testDefinition.service';
import { CreateTestDefinitionDtoSchema } from '@/modules/test-definition/dtos/CreateTestDefinitionDto';

export type TCreateTestDefinitionRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  targetId: number;
  dto: CreateTestDefinitionDtoSchema;
};

@Injectable()
export class CreateTestDefinitionUseCase
  implements UseCase<TCreateTestDefinitionRequest, TestDefinition>
{
  constructor(private readonly testDefinitionService: TestDefinitionService) {}

  async execute(
    request: TCreateTestDefinitionRequest,
  ): Promise<TestDefinition> {
    const result = await this.testDefinitionService.createDefinition(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.targetId,
      request.dto,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

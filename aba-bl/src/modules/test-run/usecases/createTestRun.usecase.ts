import { Injectable } from '@nestjs/common';
import { TestRun } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { TestRunService } from '@/modules/test-run/services/testRun.service';

export type TCreateTestRunRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  pageId?: number;
  definitionId?: number;
  triggeredByUserId: number | null;
};

@Injectable()
export class CreateTestRunUseCase
  implements UseCase<TCreateTestRunRequest, TestRun>
{
  constructor(private readonly testRunService: TestRunService) {}

  async execute(request: TCreateTestRunRequest): Promise<TestRun> {
    const result = await this.testRunService.triggerRun(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.pageId,
      request.definitionId,
      request.triggeredByUserId,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

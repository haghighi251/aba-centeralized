import { Injectable } from '@nestjs/common';
import { TestRun } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { TestRunService } from '@/modules/test-run/services/testRun.service';

export type TGetTestRunsRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
};

@Injectable()
export class GetTestRunsUseCase
  implements UseCase<TGetTestRunsRequest, { data: TestRun[]; total: number }>
{
  constructor(private readonly testRunService: TestRunService) {}

  async execute(
    request: TGetTestRunsRequest,
  ): Promise<{ data: TestRun[]; total: number }> {
    const result = await this.testRunService.listRuns(
      request.companyId,
      request.environmentId,
      request.serviceId,
    );
    if (result.isErr()) throw result.error;
    return { data: result.value, total: result.value.length };
  }
}

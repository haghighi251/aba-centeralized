import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { TestRunService } from '@/modules/test-run/services/testRun.service';

export type TGetTestRunByIdRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  runId: number;
};

@Injectable()
export class GetTestRunByIdUseCase
  implements UseCase<TGetTestRunByIdRequest, unknown>
{
  constructor(private readonly testRunService: TestRunService) {}

  async execute(request: TGetTestRunByIdRequest): Promise<unknown> {
    const result = await this.testRunService.getRunById(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.runId,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

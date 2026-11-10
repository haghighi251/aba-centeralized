import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { TestRunService } from '@/modules/test-run/services/testRun.service';
import { TestRunMaterials } from '@/modules/test-run/types/testRunMaterials';

export type TGetTestRunMaterialsRequest = {
  runKey: string;
};

@Injectable()
export class GetTestRunMaterialsUseCase
  implements UseCase<TGetTestRunMaterialsRequest, TestRunMaterials>
{
  constructor(private readonly testRunService: TestRunService) {}

  async execute(
    request: TGetTestRunMaterialsRequest,
  ): Promise<TestRunMaterials> {
    const result = await this.testRunService.getMaterials(request.runKey);
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

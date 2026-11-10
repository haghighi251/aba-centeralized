import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { TestPageService } from '@/modules/test-page/services/testPage.service';
import {
  TestPageView,
  toTestPageView,
} from '@/modules/test-page/types/testPageView';

export type TGetTestPagesRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
};

@Injectable()
export class GetTestPagesUseCase
  implements UseCase<TGetTestPagesRequest, { data: TestPageView[]; total: number }>
{
  constructor(private readonly testPageService: TestPageService) {}

  async execute(
    request: TGetTestPagesRequest,
  ): Promise<{ data: TestPageView[]; total: number }> {
    const result = await this.testPageService.listTargets(
      request.companyId,
      request.environmentId,
      request.serviceId,
    );
    if (result.isErr()) throw result.error;
    const data = result.value.map(toTestPageView);
    return { data, total: data.length };
  }
}

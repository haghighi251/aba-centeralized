import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { TestPageService } from '@/modules/test-page/services/testPage.service';
import {
  TestPageView,
  toTestPageView,
} from '@/modules/test-page/types/testPageView';

export type TGetTestPageByIdRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  targetId: number;
};

@Injectable()
export class GetTestPageByIdUseCase
  implements UseCase<TGetTestPageByIdRequest, TestPageView>
{
  constructor(private readonly testPageService: TestPageService) {}

  async execute(request: TGetTestPageByIdRequest): Promise<TestPageView> {
    const result = await this.testPageService.getTarget(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.targetId,
    );
    if (result.isErr()) throw result.error;
    return toTestPageView(result.value);
  }
}

import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { TestPageService } from '@/modules/test-page/services/testPage.service';
import {
  TestPageView,
  toTestPageView,
} from '@/modules/test-page/types/testPageView';

export type TDeleteTestPageRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  targetId: number;
};

@Injectable()
export class DeleteTestPageUseCase
  implements UseCase<TDeleteTestPageRequest, TestPageView>
{
  constructor(private readonly testPageService: TestPageService) {}

  async execute(request: TDeleteTestPageRequest): Promise<TestPageView> {
    const result = await this.testPageService.deleteTarget(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.targetId,
    );
    if (result.isErr()) throw result.error;
    return toTestPageView(result.value);
  }
}

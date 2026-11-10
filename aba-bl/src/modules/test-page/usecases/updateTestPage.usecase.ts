import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { TestPageService } from '@/modules/test-page/services/testPage.service';
import { UpdateTestPageDtoSchema } from '@/modules/test-page/dtos/UpdateTestPageDto';
import {
  TestPageView,
  toTestPageView,
} from '@/modules/test-page/types/testPageView';

export type TUpdateTestPageRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  targetId: number;
  dto: UpdateTestPageDtoSchema;
};

@Injectable()
export class UpdateTestPageUseCase
  implements UseCase<TUpdateTestPageRequest, TestPageView>
{
  constructor(private readonly testPageService: TestPageService) {}

  async execute(request: TUpdateTestPageRequest): Promise<TestPageView> {
    const result = await this.testPageService.updateTarget(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.targetId,
      request.dto,
    );
    if (result.isErr()) throw result.error;
    return toTestPageView(result.value);
  }
}

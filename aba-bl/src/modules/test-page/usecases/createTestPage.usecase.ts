import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { TestPageService } from '@/modules/test-page/services/testPage.service';
import { CreateTestPageDtoSchema } from '@/modules/test-page/dtos/CreateTestPageDto';
import {
  TestPageView,
  toTestPageView,
} from '@/modules/test-page/types/testPageView';

export type TCreateTestPageRequest = {
  companyId: number;
  environmentId: number;
  serviceId: number;
  dto: CreateTestPageDtoSchema;
};

@Injectable()
export class CreateTestPageUseCase
  implements UseCase<TCreateTestPageRequest, TestPageView>
{
  constructor(private readonly testPageService: TestPageService) {}

  async execute(request: TCreateTestPageRequest): Promise<TestPageView> {
    const result = await this.testPageService.createTarget(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.dto,
    );
    if (result.isErr()) throw result.error;
    return toTestPageView(result.value);
  }
}

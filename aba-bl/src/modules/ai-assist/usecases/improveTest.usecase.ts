import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { AiAssistService } from '@/modules/ai-assist/services/aiAssist.service';
import { ImproveTestResult } from '@/modules/ai-assist/types/aiResults';

export interface ImproveTestRequest {
  companyId: number;
  environmentId: number;
  serviceId: number;
  pageId: number;
  definitionId: number;
  userId: number | null;
  instructions?: string;
}

@Injectable()
export class ImproveTestUseCase
  implements UseCase<ImproveTestRequest, ImproveTestResult>
{
  constructor(private readonly aiAssistService: AiAssistService) {}

  async execute(request: ImproveTestRequest): Promise<ImproveTestResult> {
    const result = await this.aiAssistService.improveTest(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.pageId,
      request.definitionId,
      request.userId,
      request.instructions,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { AiAssistService } from '@/modules/ai-assist/services/aiAssist.service';
import { SuggestTestsResult } from '@/modules/ai-assist/types/aiResults';

export interface SuggestTestsRequest {
  companyId: number;
  environmentId: number;
  serviceId: number;
  pageId: number;
  userId: number | null;
  count: number;
  instructions?: string;
}

@Injectable()
export class SuggestTestsUseCase
  implements UseCase<SuggestTestsRequest, SuggestTestsResult>
{
  constructor(private readonly aiAssistService: AiAssistService) {}

  async execute(request: SuggestTestsRequest): Promise<SuggestTestsResult> {
    const result = await this.aiAssistService.suggestTests(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.pageId,
      request.userId,
      request.count,
      request.instructions,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

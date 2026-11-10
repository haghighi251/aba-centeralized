import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { AiAssistService } from '@/modules/ai-assist/services/aiAssist.service';
import { ExplainRunResult } from '@/modules/ai-assist/types/aiResults';

export interface ExplainRunRequest {
  companyId: number;
  environmentId: number;
  serviceId: number;
  runId: number;
  userId: number | null;
}

@Injectable()
export class ExplainRunUseCase
  implements UseCase<ExplainRunRequest, ExplainRunResult>
{
  constructor(private readonly aiAssistService: AiAssistService) {}

  async execute(request: ExplainRunRequest): Promise<ExplainRunResult> {
    const result = await this.aiAssistService.explainRun(
      request.companyId,
      request.environmentId,
      request.serviceId,
      request.runId,
      request.userId,
    );
    if (result.isErr()) throw result.error;
    return result.value;
  }
}

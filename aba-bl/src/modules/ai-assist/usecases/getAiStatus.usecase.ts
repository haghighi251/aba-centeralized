import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { AiAssistService } from '@/modules/ai-assist/services/aiAssist.service';
import { AiAssistStatus } from '@/modules/ai-assist/types/aiStatus';

@Injectable()
export class GetAiStatusUseCase
  implements UseCase<{ companyId: number }, AiAssistStatus>
{
  constructor(private readonly aiAssistService: AiAssistService) {}

  execute(request: { companyId: number }): Promise<AiAssistStatus> {
    return this.aiAssistService.getStatus(request.companyId);
  }
}

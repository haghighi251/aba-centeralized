import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { AiAssistService } from '@/modules/ai-assist/services/aiAssist.service';
import { AiAssistStatus } from '@/modules/ai-assist/types/aiStatus';

export interface GrantAiTokensRequest {
  companyId: number;
  tokens: number;
  pricePaidUsd: number;
  note?: string;
}

@Injectable()
export class GrantAiTokensUseCase
  implements UseCase<GrantAiTokensRequest, AiAssistStatus>
{
  constructor(private readonly aiAssistService: AiAssistService) {}

  execute(request: GrantAiTokensRequest): Promise<AiAssistStatus> {
    return this.aiAssistService.grantTokens(
      request.companyId,
      request.tokens,
      request.pricePaidUsd,
      request.note ?? null,
    );
  }
}

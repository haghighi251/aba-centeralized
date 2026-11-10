import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse as ApiResponseDecorator,
  ApiTags,
} from '@nestjs/swagger';
import { InternalApiKeyGuard } from '@/modules/test-run/guards/internalApiKey.guard';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import { createResponse } from '@/shared/utils/createResponse';
import { ApiResponse } from '@/shared/types/apiResponse';
import {
  GrantAiTokensDto,
  GrantAiTokensDtoSchema,
} from '@/modules/ai-assist/dtos/AiAssistDtos';
import { GrantAiTokensUseCase } from '@/modules/ai-assist/usecases/grantAiTokens.usecase';

/**
 * Internal admin tooling to credit an AI-token top-up to a company. In this
 * phase there is no payment gateway; a top-up is a direct grant guarded by
 * INTERNAL_API_KEY (the same guard the worker uses for internal endpoints).
 */
@ApiTags('AI Assist (internal)')
@Controller('internal/ai')
@UseGuards(InternalApiKeyGuard)
export class InternalAiTokenController {
  constructor(private readonly grantAiTokensUseCase: GrantAiTokensUseCase) {}

  @ApiOperation({
    summary: 'Grant an AI-token top-up to a company (internal)',
    description:
      'Credits `tokens` to the company for the current billing period. ' +
      'Requires the x-internal-api-key header.',
  })
  @HttpCode(HttpStatus.CREATED)
  @Post('token-grants')
  async grant(
    @Body(new ZodValidationPipe(GrantAiTokensDto)) dto: GrantAiTokensDtoSchema,
  ): Promise<ApiResponse<unknown>> {
    const status = await this.grantAiTokensUseCase.execute({
      companyId: dto.companyId,
      tokens: dto.tokens,
      pricePaidUsd: dto.pricePaidUsd,
      note: dto.note,
    });
    return createResponse(true, null, status);
  }
}

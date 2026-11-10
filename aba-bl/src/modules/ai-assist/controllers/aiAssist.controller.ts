import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse as ApiResponseDecorator,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { CompanyAccessGuard } from '@/modules/company/guards/company-access.guard';
import { CompanyManagerGuard } from '@/modules/company/guards/company-manager.guard';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import { createResponse } from '@/shared/utils/createResponse';
import { ApiResponse } from '@/shared/types/apiResponse';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';
import {
  ImproveTestDto,
  ImproveTestDtoSchema,
  SuggestTestsDto,
  SuggestTestsDtoSchema,
} from '@/modules/ai-assist/dtos/AiAssistDtos';
import { GetAiStatusUseCase } from '@/modules/ai-assist/usecases/getAiStatus.usecase';
import { SuggestTestsUseCase } from '@/modules/ai-assist/usecases/suggestTests.usecase';
import { ExplainRunUseCase } from '@/modules/ai-assist/usecases/explainRun.usecase';
import { ImproveTestUseCase } from '@/modules/ai-assist/usecases/improveTest.usecase';

@ApiTags('AI Assist')
@ApiBearerAuth()
@Controller('company')
@UseGuards(AuthGuard)
export class AiAssistController {
  constructor(
    private readonly getAiStatusUseCase: GetAiStatusUseCase,
    private readonly suggestTestsUseCase: SuggestTestsUseCase,
    private readonly explainRunUseCase: ExplainRunUseCase,
    private readonly improveTestUseCase: ImproveTestUseCase,
  ) {}

  @ApiOperation({
    summary: 'AI assist availability & token balance',
    description:
      'Returns whether AI assist is enabled (plan grants an allowance AND the ' +
      'server has an API key) and the remaining token balance for the current ' +
      'billing period. The dashboard greys out AI actions when disabled or ' +
      'exhausted.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiResponseDecorator({ status: 200, description: 'AI assist status.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id/environments/:envId/services/:serviceId/ai/status')
  @UseGuards(CompanyAccessGuard)
  async status(
    @Param('id', ParseIntPipe) companyId: number,
  ): Promise<ApiResponse<unknown>> {
    const status = await this.getAiStatusUseCase.execute({ companyId });
    return createResponse(true, null, status);
  }

  @ApiOperation({
    summary: 'Suggest tests for a page (AI)',
    description:
      'Asks Claude to suggest security tests for the page. Each suggestion ' +
      'has a title, summary, detail, and a validated config/assertions the ' +
      'customer can select to auto-add. Metered against the token allowance; ' +
      '402 when exhausted, 403 when AI is disabled. Managers only.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiParam({ name: 'pageId', type: 'number' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', default: 5, minimum: 1, maximum: 8 },
        instructions: { type: 'string' },
      },
    },
  })
  @ApiResponseDecorator({ status: 200, description: 'Suggested tests + usage.' })
  @ApiResponseDecorator({ status: 402, description: 'Token allowance exhausted.' })
  @ApiResponseDecorator({ status: 403, description: 'AI disabled or not a manager.' })
  @HttpCode(HttpStatus.OK)
  @Post(
    ':id/environments/:envId/services/:serviceId/test-pages/:pageId/ai/suggest-tests',
  )
  @UseGuards(CompanyManagerGuard)
  async suggest(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('pageId', ParseIntPipe) pageId: number,
    @Body(new ZodValidationPipe(SuggestTestsDto)) dto: SuggestTestsDtoSchema,
    @Req() req: Request,
  ): Promise<ApiResponse<unknown>> {
    const result = await this.suggestTestsUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      pageId,
      userId: (req as any).user?.sub ?? null,
      count: dto.count,
      instructions: dto.instructions,
    });
    return createResponse(true, null, result);
  }

  @ApiOperation({
    summary: 'Explain / validate a test run (AI)',
    description:
      'Asks Claude to explain a completed run’s results in plain language, ' +
      'with security implications and remediation. Metered. Managers only.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiParam({ name: 'runId', type: 'number' })
  @ApiResponseDecorator({ status: 200, description: 'Explanation + usage.' })
  @ApiResponseDecorator({ status: 402, description: 'Token allowance exhausted.' })
  @ApiResponseDecorator({ status: 403, description: 'AI disabled or not a manager.' })
  @HttpCode(HttpStatus.OK)
  @Post(
    ':id/environments/:envId/services/:serviceId/test-runs/:runId/ai/explain',
  )
  @UseGuards(CompanyManagerGuard)
  async explain(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('runId', ParseIntPipe) runId: number,
    @Req() req: Request,
  ): Promise<ApiResponse<unknown>> {
    const result = await this.explainRunUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      runId,
      userId: (req as any).user?.sub ?? null,
    });
    return createResponse(true, null, result);
  }

  @ApiOperation({
    summary: 'Improve a test (AI)',
    description:
      'Asks Claude to strengthen a test’s assertions/scenarios and fix weak ' +
      'config without changing its target. Returns a validated proposal the ' +
      'customer can apply. Metered. Managers only.',
  })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'envId', type: 'number' })
  @ApiParam({ name: 'serviceId', type: 'number' })
  @ApiParam({ name: 'pageId', type: 'number' })
  @ApiParam({ name: 'definitionId', type: 'number' })
  @ApiBody({
    schema: { type: 'object', properties: { instructions: { type: 'string' } } },
  })
  @ApiResponseDecorator({ status: 200, description: 'Improved test + usage.' })
  @ApiResponseDecorator({ status: 402, description: 'Token allowance exhausted.' })
  @ApiResponseDecorator({ status: 403, description: 'AI disabled or not a manager.' })
  @HttpCode(HttpStatus.OK)
  @Post(
    ':id/environments/:envId/services/:serviceId/test-pages/:pageId/test-definitions/:definitionId/ai/improve',
  )
  @UseGuards(CompanyManagerGuard)
  async improve(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('envId', ParseIntPipe) environmentId: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
    @Param('pageId', ParseIntPipe) pageId: number,
    @Param('definitionId', ParseIntPipe) definitionId: number,
    @Body(new ZodValidationPipe(ImproveTestDto)) dto: ImproveTestDtoSchema,
    @Req() req: Request,
  ): Promise<ApiResponse<unknown>> {
    const result = await this.improveTestUseCase.execute({
      companyId,
      environmentId,
      serviceId,
      pageId,
      definitionId,
      userId: (req as any).user?.sub ?? null,
      instructions: dto.instructions,
    });
    return createResponse(true, null, result);
  }
}

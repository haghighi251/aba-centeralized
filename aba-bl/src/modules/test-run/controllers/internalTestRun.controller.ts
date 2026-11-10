import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiExcludeController,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { createResponse } from '@/shared/utils/createResponse';
import { ApiResponse } from '@/shared/types/apiResponse';
import { InternalApiKeyGuard } from '@/modules/test-run/guards/internalApiKey.guard';
import { GetTestRunMaterialsUseCase } from '@/modules/test-run/usecases/getTestRunMaterials.usecase';
import { TestRunMaterials } from '@/modules/test-run/types/testRunMaterials';

/**
 * Internal, service-to-service only. The worker's Test Executor calls this to
 * fetch decrypted auth material for a run's targets, keyed by runKey, with the
 * x-internal-api-key header. Hidden from Swagger and guarded by
 * INTERNAL_API_KEY — never exposed to customers.
 *
 * GET (not POST) because it's a read with no side effects; the sensitivity is
 * handled by the guard, not the verb.
 */
@ApiExcludeController()
@Controller('internal/test-runs')
@UseGuards(InternalApiKeyGuard)
export class InternalTestRunController {
  constructor(
    private readonly getTestRunMaterialsUseCase: GetTestRunMaterialsUseCase,
  ) {}

  @ApiOperation({ summary: 'Resolve decrypted auth material for a run (internal).' })
  @ApiParam({ name: 'runKey', type: 'string' })
  @HttpCode(HttpStatus.OK)
  @Get(':runKey/materials')
  async materials(
    @Param('runKey') runKey: string,
  ): Promise<ApiResponse<TestRunMaterials>> {
    const materials = await this.getTestRunMaterialsUseCase.execute({ runKey });
    return createResponse(true, null, materials);
  }
}

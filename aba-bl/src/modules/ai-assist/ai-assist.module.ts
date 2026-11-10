import { Module } from '@nestjs/common';
import { AiAssistController } from '@/modules/ai-assist/controllers/aiAssist.controller';
import { InternalAiTokenController } from '@/modules/ai-assist/controllers/internalAiToken.controller';
import { AnthropicClientService } from '@/modules/ai-assist/services/anthropicClient.service';
import { AiMeteringService } from '@/modules/ai-assist/services/aiMetering.service';
import { AiAssistService } from '@/modules/ai-assist/services/aiAssist.service';
import { AiUsageRepository } from '@/modules/ai-assist/repositories/aiUsage.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { TestPageRepository } from '@/modules/test-page/repositories/testPage.repository';
import { TestDefinitionRepository } from '@/modules/test-definition/repositories/testDefinition.repository';
import { TestRunRepository } from '@/modules/test-run/repositories/testRun.repository';
import { GetAiStatusUseCase } from '@/modules/ai-assist/usecases/getAiStatus.usecase';
import { SuggestTestsUseCase } from '@/modules/ai-assist/usecases/suggestTests.usecase';
import { ExplainRunUseCase } from '@/modules/ai-assist/usecases/explainRun.usecase';
import { ImproveTestUseCase } from '@/modules/ai-assist/usecases/improveTest.usecase';
import { GrantAiTokensUseCase } from '@/modules/ai-assist/usecases/grantAiTokens.usecase';

@Module({
  controllers: [AiAssistController, InternalAiTokenController],
  providers: [
    AnthropicClientService,
    AiMeteringService,
    AiAssistService,
    AiUsageRepository,
    CompanyRepository,
    EnvironmentRepository,
    ServiceRepository,
    TestPageRepository,
    TestDefinitionRepository,
    TestRunRepository,
    GetAiStatusUseCase,
    SuggestTestsUseCase,
    ExplainRunUseCase,
    ImproveTestUseCase,
    GrantAiTokensUseCase,
  ],
})
export class AiAssistModule {}

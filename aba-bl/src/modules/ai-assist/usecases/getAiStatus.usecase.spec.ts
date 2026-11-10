import { Test, TestingModule } from '@nestjs/testing';
import { GetAiStatusUseCase } from './getAiStatus.usecase';
import { AiAssistService } from '@/modules/ai-assist/services/aiAssist.service';

describe('GetAiStatusUseCase', () => {
  let useCase: GetAiStatusUseCase;
  let aiAssistService: { getStatus: jest.Mock };

  beforeEach(async () => {
    aiAssistService = { getStatus: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAiStatusUseCase,
        { provide: AiAssistService, useValue: aiAssistService },
      ],
    }).compile();
    useCase = module.get(GetAiStatusUseCase);
  });

  it('delegates to AiAssistService.getStatus', async () => {
    const status = { enabled: true } as any;
    aiAssistService.getStatus.mockResolvedValue(status);
    await expect(useCase.execute({ companyId: 1 })).resolves.toBe(status);
    expect(aiAssistService.getStatus).toHaveBeenCalledWith(1);
  });
});

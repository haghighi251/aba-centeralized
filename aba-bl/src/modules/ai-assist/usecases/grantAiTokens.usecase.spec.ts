import { Test, TestingModule } from '@nestjs/testing';
import { GrantAiTokensUseCase } from './grantAiTokens.usecase';
import { AiAssistService } from '@/modules/ai-assist/services/aiAssist.service';

describe('GrantAiTokensUseCase', () => {
  let useCase: GrantAiTokensUseCase;
  let aiAssistService: { grantTokens: jest.Mock };

  beforeEach(async () => {
    aiAssistService = { grantTokens: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GrantAiTokensUseCase,
        { provide: AiAssistService, useValue: aiAssistService },
      ],
    }).compile();
    useCase = module.get(GrantAiTokensUseCase);
  });

  it('delegates to grantTokens with a null note default', async () => {
    const status = { remaining: 1000 } as any;
    aiAssistService.grantTokens.mockResolvedValue(status);
    await expect(
      useCase.execute({ companyId: 1, tokens: 1000, pricePaidUsd: 0 }),
    ).resolves.toBe(status);
    expect(aiAssistService.grantTokens).toHaveBeenCalledWith(1, 1000, 0, null);
  });

  it('passes the note through when given', async () => {
    aiAssistService.grantTokens.mockResolvedValue({} as any);
    await useCase.execute({
      companyId: 2,
      tokens: 50,
      pricePaidUsd: 5,
      note: 'manual grant',
    });
    expect(aiAssistService.grantTokens).toHaveBeenCalledWith(2, 50, 5, 'manual grant');
  });
});

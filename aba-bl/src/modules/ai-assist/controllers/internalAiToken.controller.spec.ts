import { Test, TestingModule } from '@nestjs/testing';
import { InternalAiTokenController } from './internalAiToken.controller';
import { GrantAiTokensUseCase } from '@/modules/ai-assist/usecases/grantAiTokens.usecase';

describe('InternalAiTokenController', () => {
  let controller: InternalAiTokenController;
  let grantAiTokensUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    grantAiTokensUseCase = { execute: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalAiTokenController],
      providers: [
        { provide: GrantAiTokensUseCase, useValue: grantAiTokensUseCase },
      ],
    }).compile();
    controller = module.get(InternalAiTokenController);
  });

  it('grants tokens and returns the refreshed status in the standard response', async () => {
    const status = { remaining: 5000 };
    grantAiTokensUseCase.execute.mockResolvedValue(status);
    const res = await controller.grant({
      companyId: 1,
      tokens: 5000,
      pricePaidUsd: 0,
      note: 'topup',
    });
    expect(res).toEqual({ success: true, error: null, data: status });
    expect(grantAiTokensUseCase.execute).toHaveBeenCalledWith({
      companyId: 1,
      tokens: 5000,
      pricePaidUsd: 0,
      note: 'topup',
    });
  });
});

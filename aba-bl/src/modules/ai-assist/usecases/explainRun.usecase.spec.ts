import { Test, TestingModule } from '@nestjs/testing';
import { ok, err } from 'neverthrow';
import { NotFoundException } from '@nestjs/common';
import { ExplainRunUseCase } from './explainRun.usecase';
import { AiAssistService } from '@/modules/ai-assist/services/aiAssist.service';

describe('ExplainRunUseCase', () => {
  let useCase: ExplainRunUseCase;
  let aiAssistService: { explainRun: jest.Mock };

  const req = {
    companyId: 1,
    environmentId: 1,
    serviceId: 1,
    runId: 5,
    userId: 9,
  };

  beforeEach(async () => {
    aiAssistService = { explainRun: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExplainRunUseCase,
        { provide: AiAssistService, useValue: aiAssistService },
      ],
    }).compile();
    useCase = module.get(ExplainRunUseCase);
  });

  it('returns the value on success', async () => {
    const value = { summary: 'ok', perTest: [], recommendations: [], usage: {} };
    aiAssistService.explainRun.mockResolvedValue(ok(value));
    await expect(useCase.execute(req)).resolves.toBe(value);
    expect(aiAssistService.explainRun).toHaveBeenCalledWith(1, 1, 1, 5, 9);
  });

  it('throws the error on failure', async () => {
    aiAssistService.explainRun.mockResolvedValue(err(new NotFoundException()));
    await expect(useCase.execute(req)).rejects.toBeInstanceOf(NotFoundException);
  });
});

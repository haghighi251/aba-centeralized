import { Test, TestingModule } from '@nestjs/testing';
import { ok, err } from 'neverthrow';
import { NotFoundException } from '@nestjs/common';
import { ImproveTestUseCase } from './improveTest.usecase';
import { AiAssistService } from '@/modules/ai-assist/services/aiAssist.service';

describe('ImproveTestUseCase', () => {
  let useCase: ImproveTestUseCase;
  let aiAssistService: { improveTest: jest.Mock };

  const req = {
    companyId: 1,
    environmentId: 1,
    serviceId: 1,
    pageId: 1,
    definitionId: 2,
    userId: 9,
    instructions: 'harder',
  };

  beforeEach(async () => {
    aiAssistService = { improveTest: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImproveTestUseCase,
        { provide: AiAssistService, useValue: aiAssistService },
      ],
    }).compile();
    useCase = module.get(ImproveTestUseCase);
  });

  it('returns the value on success', async () => {
    const value = { rationale: 'r', improved: {}, usage: {} };
    aiAssistService.improveTest.mockResolvedValue(ok(value));
    await expect(useCase.execute(req)).resolves.toBe(value);
    expect(aiAssistService.improveTest).toHaveBeenCalledWith(
      1, 1, 1, 1, 2, 9, 'harder',
    );
  });

  it('throws the error on failure', async () => {
    aiAssistService.improveTest.mockResolvedValue(err(new NotFoundException()));
    await expect(useCase.execute(req)).rejects.toBeInstanceOf(NotFoundException);
  });
});

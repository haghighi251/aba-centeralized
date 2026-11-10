import { Test, TestingModule } from '@nestjs/testing';
import { ok, err } from 'neverthrow';
import { NotFoundException } from '@nestjs/common';
import { SuggestTestsUseCase } from './suggestTests.usecase';
import { AiAssistService } from '@/modules/ai-assist/services/aiAssist.service';

describe('SuggestTestsUseCase', () => {
  let useCase: SuggestTestsUseCase;
  let aiAssistService: { suggestTests: jest.Mock };

  const req = {
    companyId: 1,
    environmentId: 1,
    serviceId: 1,
    pageId: 1,
    userId: 7,
    count: 3,
    instructions: 'x',
  };

  beforeEach(async () => {
    aiAssistService = { suggestTests: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuggestTestsUseCase,
        { provide: AiAssistService, useValue: aiAssistService },
      ],
    }).compile();
    useCase = module.get(SuggestTestsUseCase);
  });

  it('returns the value on success', async () => {
    const value = { suggestions: [], usage: {} };
    aiAssistService.suggestTests.mockResolvedValue(ok(value));
    await expect(useCase.execute(req)).resolves.toBe(value);
    expect(aiAssistService.suggestTests).toHaveBeenCalledWith(
      1, 1, 1, 1, 7, 3, 'x',
    );
  });

  it('throws the error on failure', async () => {
    aiAssistService.suggestTests.mockResolvedValue(
      err(new NotFoundException('nope')),
    );
    await expect(useCase.execute(req)).rejects.toBeInstanceOf(NotFoundException);
  });
});

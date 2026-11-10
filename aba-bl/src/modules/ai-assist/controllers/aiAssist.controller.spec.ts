import { Test, TestingModule } from '@nestjs/testing';
import { AiAssistController } from './aiAssist.controller';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { CompanyAccessGuard } from '@/modules/company/guards/company-access.guard';
import { CompanyManagerGuard } from '@/modules/company/guards/company-manager.guard';
import { GetAiStatusUseCase } from '@/modules/ai-assist/usecases/getAiStatus.usecase';
import { SuggestTestsUseCase } from '@/modules/ai-assist/usecases/suggestTests.usecase';
import { ExplainRunUseCase } from '@/modules/ai-assist/usecases/explainRun.usecase';
import { ImproveTestUseCase } from '@/modules/ai-assist/usecases/improveTest.usecase';

describe('AiAssistController', () => {
  let controller: AiAssistController;
  let getAiStatusUseCase: { execute: jest.Mock };
  let suggestTestsUseCase: { execute: jest.Mock };
  let explainRunUseCase: { execute: jest.Mock };
  let improveTestUseCase: { execute: jest.Mock };

  const req: any = { user: { sub: 7 } };

  beforeEach(async () => {
    getAiStatusUseCase = { execute: jest.fn() };
    suggestTestsUseCase = { execute: jest.fn() };
    explainRunUseCase = { execute: jest.fn() };
    improveTestUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiAssistController],
      providers: [
        { provide: GetAiStatusUseCase, useValue: getAiStatusUseCase },
        { provide: SuggestTestsUseCase, useValue: suggestTestsUseCase },
        { provide: ExplainRunUseCase, useValue: explainRunUseCase },
        { provide: ImproveTestUseCase, useValue: improveTestUseCase },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CompanyAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CompanyManagerGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(AiAssistController);
  });

  it('status wraps the use-case result in the standard response', async () => {
    const status = { enabled: true };
    getAiStatusUseCase.execute.mockResolvedValue(status);
    const res = await controller.status(1);
    expect(res).toEqual({ success: true, error: null, data: status });
    expect(getAiStatusUseCase.execute).toHaveBeenCalledWith({ companyId: 1 });
  });

  it('suggest forwards params + body and the requesting user id', async () => {
    const result = { suggestions: [] };
    suggestTestsUseCase.execute.mockResolvedValue(result);
    const res = await controller.suggest(1, 2, 3, 4, { count: 5, instructions: 'x' }, req);
    expect(res).toEqual({ success: true, error: null, data: result });
    expect(suggestTestsUseCase.execute).toHaveBeenCalledWith({
      companyId: 1,
      environmentId: 2,
      serviceId: 3,
      pageId: 4,
      userId: 7,
      count: 5,
      instructions: 'x',
    });
  });

  it('explain forwards the run id and user id', async () => {
    explainRunUseCase.execute.mockResolvedValue({ summary: 's' });
    await controller.explain(1, 2, 3, 9, req);
    expect(explainRunUseCase.execute).toHaveBeenCalledWith({
      companyId: 1,
      environmentId: 2,
      serviceId: 3,
      runId: 9,
      userId: 7,
    });
  });

  it('improve forwards ids, instructions and user id', async () => {
    improveTestUseCase.execute.mockResolvedValue({ rationale: 'r' });
    await controller.improve(1, 2, 3, 4, 5, { instructions: 'harder' }, req);
    expect(improveTestUseCase.execute).toHaveBeenCalledWith({
      companyId: 1,
      environmentId: 2,
      serviceId: 3,
      pageId: 4,
      definitionId: 5,
      userId: 7,
      instructions: 'harder',
    });
  });

  it('defaults userId to null when no authenticated user is present', async () => {
    suggestTestsUseCase.execute.mockResolvedValue({ suggestions: [] });
    await controller.suggest(1, 2, 3, 4, { count: 3 } as any, {} as any);
    expect(suggestTestsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null }),
    );
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Environment, EnvironmentStatus, EnvironmentType } from '@aba/database';
import { EnvironmentController } from './environment.controller';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { CreateEnvironmentUseCase } from '@/modules/environment/usecases/createEnvironment.usecase';
import { GetEnvironmentsUseCase } from '@/modules/environment/usecases/getEnvironments.usecase';
import { GetEnvironmentByIdUseCase } from '@/modules/environment/usecases/getEnvironmentById.usecase';
import { UpdateEnvironmentUseCase } from '@/modules/environment/usecases/updateEnvironment.usecase';
import { DeleteEnvironmentUseCase } from '@/modules/environment/usecases/deleteEnvironment.usecase';

describe('EnvironmentController', () => {
  let controller: EnvironmentController;
  let createEnvironmentUseCase: jest.Mocked<CreateEnvironmentUseCase>;
  let getEnvironmentsUseCase: jest.Mocked<GetEnvironmentsUseCase>;
  let getEnvironmentByIdUseCase: jest.Mocked<GetEnvironmentByIdUseCase>;
  let updateEnvironmentUseCase: jest.Mocked<UpdateEnvironmentUseCase>;
  let deleteEnvironmentUseCase: jest.Mocked<DeleteEnvironmentUseCase>;

  const mockEnvironment: Environment = {
    id: 1,
    name: 'Production',
    slug: 'production',
    type: EnvironmentType.PRODUCTION,
    isProduction: true,
    order: 4,
    description: null,
    status: EnvironmentStatus.ACTIVE,
    companyId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as Environment;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnvironmentController],
      providers: [
        { provide: CreateEnvironmentUseCase, useValue: { execute: jest.fn() } },
        { provide: GetEnvironmentsUseCase, useValue: { execute: jest.fn() } },
        {
          provide: GetEnvironmentByIdUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: UpdateEnvironmentUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteEnvironmentUseCase, useValue: { execute: jest.fn() } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get(EnvironmentController);
    createEnvironmentUseCase = module.get(CreateEnvironmentUseCase);
    getEnvironmentsUseCase = module.get(GetEnvironmentsUseCase);
    getEnvironmentByIdUseCase = module.get(GetEnvironmentByIdUseCase);
    updateEnvironmentUseCase = module.get(UpdateEnvironmentUseCase);
    deleteEnvironmentUseCase = module.get(DeleteEnvironmentUseCase);
  });

  describe('getEnvironments', () => {
    it('returns the list of environments for the company', async () => {
      getEnvironmentsUseCase.execute.mockResolvedValue({
        data: [mockEnvironment],
        total: 1,
      });

      const result = await controller.getEnvironments(1, {
        sortBy: 'order',
        sortOrder: 'asc',
      });

      expect(result).toEqual({
        success: true,
        error: null,
        data: { data: [mockEnvironment], total: 1 },
      });
      expect(getEnvironmentsUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        sortBy: 'order',
        sortOrder: 'asc',
      });
    });
  });

  describe('getEnvironment', () => {
    it('returns the environment when found', async () => {
      getEnvironmentByIdUseCase.execute.mockResolvedValue(mockEnvironment);

      const result = await controller.getEnvironment(1, 1);

      expect(result).toEqual({
        success: true,
        error: null,
        data: mockEnvironment,
      });
      expect(getEnvironmentByIdUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      getEnvironmentByIdUseCase.execute.mockRejectedValue(
        new NotFoundException('Environment not found.'),
      );

      await expect(controller.getEnvironment(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createEnvironment', () => {
    it('creates and returns the new environment', async () => {
      createEnvironmentUseCase.execute.mockResolvedValue(mockEnvironment);

      const result = await controller.createEnvironment(1, {
        name: 'Production',
        type: EnvironmentType.PRODUCTION,
        isProduction: true,
      });

      expect(result).toEqual({
        success: true,
        error: null,
        data: mockEnvironment,
      });
      expect(createEnvironmentUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        dto: {
          name: 'Production',
          type: EnvironmentType.PRODUCTION,
          isProduction: true,
        },
      });
    });

    it('propagates a ConflictException from the use case', async () => {
      createEnvironmentUseCase.execute.mockRejectedValue(
        new ConflictException('slug taken'),
      );

      await expect(
        controller.createEnvironment(1, {
          name: 'Production',
          type: EnvironmentType.PRODUCTION,
          isProduction: true,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateEnvironment', () => {
    it('updates and returns the environment', async () => {
      const updated = { ...mockEnvironment, name: 'Prod EU' };
      updateEnvironmentUseCase.execute.mockResolvedValue(updated);

      const result = await controller.updateEnvironment(1, 1, {
        name: 'Prod EU',
      });

      expect(result).toEqual({ success: true, error: null, data: updated });
      expect(updateEnvironmentUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
        dto: { name: 'Prod EU' },
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      updateEnvironmentUseCase.execute.mockRejectedValue(
        new NotFoundException('Environment not found.'),
      );

      await expect(
        controller.updateEnvironment(1, 999, { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteEnvironment', () => {
    it('deletes and returns the environment', async () => {
      deleteEnvironmentUseCase.execute.mockResolvedValue(mockEnvironment);

      const result = await controller.deleteEnvironment(1, 1);

      expect(result).toEqual({
        success: true,
        error: null,
        data: mockEnvironment,
      });
      expect(deleteEnvironmentUseCase.execute).toHaveBeenCalledWith({
        companyId: 1,
        environmentId: 1,
      });
    });

    it('propagates a NotFoundException from the use case', async () => {
      deleteEnvironmentUseCase.execute.mockRejectedValue(
        new NotFoundException('Environment not found.'),
      );

      await expect(controller.deleteEnvironment(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

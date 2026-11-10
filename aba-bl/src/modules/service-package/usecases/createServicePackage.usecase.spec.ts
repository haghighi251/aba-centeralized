import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { DependencyEcosystem, ServicePackageStatus } from '@aba/database';
import { CreateServicePackageUseCase } from './createServicePackage.usecase';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';

describe('CreateServicePackageUseCase', () => {
  let useCase: CreateServicePackageUseCase;
  let service: jest.Mocked<ServicePackageService>;

  const mockSP = {
    id: 10,
    status: ServicePackageStatus.ACTIVE,
    versionRange: null,
    introducedAt: new Date('2024-01-01T00:00:00.000Z'),
    deactivatedAt: null,
    alarmCount: 0,
    lastAlarmAt: null,
    serviceId: 1,
    packageId: 1,
    package: {
      id: 1,
      ecosystem: DependencyEcosystem.NPM,
      name: 'express',
      version: '4.18.2',
      createdAt: new Date(),
    },
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateServicePackageUseCase,
        {
          provide: ServicePackageService,
          useValue: { createPackage: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(CreateServicePackageUseCase);
    service = module.get(ServicePackageService);
  });

  it('returns the created service package on success', async () => {
    service.createPackage.mockResolvedValue(ok(mockSP));

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 1,
      actingUserId: 5,
      dto: {
        name: 'express',
        version: '4.18.2',
        ecosystem: DependencyEcosystem.NPM,
      },
    });

    expect(result).toBe(mockSP);
    expect(service.createPackage).toHaveBeenCalledWith(1, 1, 1, 5, {
      name: 'express',
      version: '4.18.2',
      ecosystem: DependencyEcosystem.NPM,
    });
  });

  it('throws ConflictException when the version is already active', async () => {
    service.createPackage.mockResolvedValue(
      err(new ConflictException('already active')),
    );

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        actingUserId: 5,
        dto: {
          name: 'express',
          version: '4.18.2',
          ecosystem: DependencyEcosystem.NPM,
        },
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException when the service is not found', async () => {
    service.createPackage.mockResolvedValue(
      err(new NotFoundException('not found')),
    );

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        serviceId: 999,
        actingUserId: 5,
        dto: {
          name: 'express',
          version: '4.18.2',
          ecosystem: DependencyEcosystem.NPM,
        },
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

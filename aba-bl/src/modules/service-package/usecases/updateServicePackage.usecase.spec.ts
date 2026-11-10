import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { DependencyEcosystem, ServicePackageStatus } from '@aba/database';
import { UpdateServicePackageUseCase } from './updateServicePackage.usecase';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';

describe('UpdateServicePackageUseCase', () => {
  let useCase: UpdateServicePackageUseCase;
  let service: jest.Mocked<ServicePackageService>;

  const mockSP = {
    id: 10,
    status: ServicePackageStatus.ACTIVE,
    versionRange: '^4.19.0',
    introducedAt: new Date('2024-01-01T00:00:00.000Z'),
    deactivatedAt: null,
    alarmCount: 0,
    lastAlarmAt: null,
    serviceId: 1,
    packageId: 2,
    package: {
      id: 2,
      ecosystem: DependencyEcosystem.NPM,
      name: 'express',
      version: '4.19.0',
      createdAt: new Date(),
    },
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateServicePackageUseCase,
        {
          provide: ServicePackageService,
          useValue: { updatePackage: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UpdateServicePackageUseCase);
    service = module.get(ServicePackageService);
  });

  it('returns the updated service package on success', async () => {
    service.updatePackage.mockResolvedValue(ok(mockSP));

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 1,
      servicePackageId: 10,
      actingUserId: 5,
      dto: { version: '4.19.0' },
    });

    expect(result).toBe(mockSP);
    expect(service.updatePackage).toHaveBeenCalledWith(1, 1, 1, 10, 5, {
      version: '4.19.0',
    });
  });

  it('throws NotFoundException when the active package is not found', async () => {
    service.updatePackage.mockResolvedValue(
      err(new NotFoundException('not found')),
    );

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        servicePackageId: 999,
        actingUserId: 5,
        dto: { version: '4.19.0' },
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ConflictException when the version is already active', async () => {
    service.updatePackage.mockResolvedValue(
      err(new ConflictException('already active')),
    );

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        servicePackageId: 10,
        actingUserId: 5,
        dto: { version: '4.18.2' },
      }),
    ).rejects.toThrow(ConflictException);
  });
});

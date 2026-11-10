import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { DependencyEcosystem, ServicePackageStatus } from '@aba/database';
import { DeleteServicePackageUseCase } from './deleteServicePackage.usecase';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';

describe('DeleteServicePackageUseCase', () => {
  let useCase: DeleteServicePackageUseCase;
  let service: jest.Mocked<ServicePackageService>;

  const mockRemoved = {
    id: 10,
    status: ServicePackageStatus.REMOVED,
    versionRange: '^4.18.0',
    introducedAt: new Date('2024-01-01T00:00:00.000Z'),
    deactivatedAt: new Date('2024-06-01T00:00:00.000Z'),
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
    updatedAt: new Date('2024-06-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteServicePackageUseCase,
        {
          provide: ServicePackageService,
          useValue: { removePackage: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(DeleteServicePackageUseCase);
    service = module.get(ServicePackageService);
  });

  it('returns the REMOVED service package on success', async () => {
    service.removePackage.mockResolvedValue(ok(mockRemoved));

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 1,
      servicePackageId: 10,
      actingUserId: 5,
    });

    expect(result).toBe(mockRemoved);
    expect(result.status).toBe(ServicePackageStatus.REMOVED);
    expect(service.removePackage).toHaveBeenCalledWith(1, 1, 1, 10, 5);
  });

  it('throws NotFoundException when the active package is not found', async () => {
    service.removePackage.mockResolvedValue(
      err(new NotFoundException('not found')),
    );

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        servicePackageId: 999,
        actingUserId: 5,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { ServicePackageStatus, DependencyEcosystem } from '@aba/database';
import { GetServicePackagesUseCase } from './getServicePackages.usecase';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';

describe('GetServicePackagesUseCase', () => {
  let useCase: GetServicePackagesUseCase;
  let service: jest.Mocked<ServicePackageService>;

  const mockSP = {
    id: 10,
    status: ServicePackageStatus.ACTIVE,
    versionRange: '^4.18.0',
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
        GetServicePackagesUseCase,
        {
          provide: ServicePackageService,
          useValue: { getActivePackages: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetServicePackagesUseCase);
    service = module.get(ServicePackageService);
  });

  it('returns the active package list on success', async () => {
    service.getActivePackages.mockResolvedValue(
      ok({ data: [mockSP], total: 1 }),
    );

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 1,
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(result).toEqual({ data: [mockSP], total: 1 });
  });

  it('throws the error returned by the service', async () => {
    service.getActivePackages.mockResolvedValue(
      err(new NotFoundException('Service not found.')),
    );

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        serviceId: 999,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

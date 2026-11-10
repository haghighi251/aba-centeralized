import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { ServicePackageStatus, DependencyEcosystem } from '@aba/database';
import { GetServicePackageHistoryUseCase } from './getServicePackageHistory.usecase';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';

describe('GetServicePackageHistoryUseCase', () => {
  let useCase: GetServicePackageHistoryUseCase;
  let service: jest.Mocked<ServicePackageService>;

  const mockStaled = {
    id: 9,
    status: ServicePackageStatus.STALE,
    versionRange: '^4.17.0',
    introducedAt: new Date('2024-01-01T00:00:00.000Z'),
    deactivatedAt: new Date('2024-06-01T00:00:00.000Z'),
    alarmCount: 0,
    lastAlarmAt: null,
    serviceId: 1,
    packageId: 2,
    package: {
      id: 2,
      ecosystem: DependencyEcosystem.NPM,
      name: 'express',
      version: '4.17.0',
      createdAt: new Date(),
    },
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-06-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetServicePackageHistoryUseCase,
        {
          provide: ServicePackageService,
          useValue: { getPackageHistory: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(GetServicePackageHistoryUseCase);
    service = module.get(ServicePackageService);
  });

  it('returns the history on success', async () => {
    service.getPackageHistory.mockResolvedValue(
      ok({ data: [mockStaled], total: 1 }),
    );

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 1,
      status: 'ALL',
      sortBy: 'deactivatedAt',
      sortOrder: 'desc',
    });

    expect(result).toEqual({ data: [mockStaled], total: 1 });
  });

  it('throws the error returned by the service', async () => {
    service.getPackageHistory.mockResolvedValue(
      err(new NotFoundException('Service not found.')),
    );

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        serviceId: 999,
        status: 'ALL',
        sortBy: 'deactivatedAt',
        sortOrder: 'desc',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

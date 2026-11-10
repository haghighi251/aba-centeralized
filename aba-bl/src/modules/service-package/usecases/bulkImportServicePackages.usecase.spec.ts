import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { DependencyEcosystem } from '@aba/database';
import { BulkImportServicePackagesUseCase } from './bulkImportServicePackages.usecase';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';

describe('BulkImportServicePackagesUseCase', () => {
  let useCase: BulkImportServicePackagesUseCase;
  let service: jest.Mocked<ServicePackageService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkImportServicePackagesUseCase,
        { provide: ServicePackageService, useValue: { bulkImport: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(BulkImportServicePackagesUseCase);
    service = module.get(ServicePackageService);
  });

  it('returns the import summary on success', async () => {
    const summary = { added: 3, updated: 1, unchanged: 2, staled: 1 };
    service.bulkImport.mockResolvedValue(ok(summary));

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 1,
      actingUserId: 5,
      dto: {
        ecosystem: DependencyEcosystem.NPM,
        packages: [
          { name: 'express', version: '4.18.2' },
          { name: 'lodash', version: '4.17.21' },
        ],
      },
    });

    expect(result).toEqual(summary);
    expect(service.bulkImport).toHaveBeenCalledWith(
      1,
      1,
      1,
      5,
      DependencyEcosystem.NPM,
      [
        { name: 'express', version: '4.18.2' },
        { name: 'lodash', version: '4.17.21' },
      ],
    );
  });

  it('throws NotFoundException when the service is not found', async () => {
    service.bulkImport.mockResolvedValue(
      err(new NotFoundException('not found')),
    );

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        serviceId: 999,
        actingUserId: 5,
        dto: {
          ecosystem: DependencyEcosystem.NPM,
          packages: [{ name: 'express', version: '4.18.2' }],
        },
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

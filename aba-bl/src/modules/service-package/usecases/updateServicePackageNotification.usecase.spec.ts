import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from 'neverthrow';
import { UpdateServicePackageNotificationUseCase } from './updateServicePackageNotification.usecase';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';

describe('UpdateServicePackageNotificationUseCase', () => {
  let useCase: UpdateServicePackageNotificationUseCase;
  let service: jest.Mocked<ServicePackageService>;

  const mockState = { id: 1, muted: true, servicePackageId: 10 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateServicePackageNotificationUseCase,
        {
          provide: ServicePackageService,
          useValue: { updateNotificationPreference: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UpdateServicePackageNotificationUseCase);
    service = module.get(ServicePackageService);
  });

  it('returns the updated state on success', async () => {
    service.updateNotificationPreference.mockResolvedValue(
      ok(mockState as any),
    );

    const result = await useCase.execute({
      companyId: 1,
      environmentId: 1,
      serviceId: 1,
      servicePackageId: 10,
      actingUserId: 5,
      dto: { action: 'MUTE' },
    });

    expect(result).toBe(mockState);
    expect(service.updateNotificationPreference).toHaveBeenCalledWith(
      1,
      1,
      1,
      10,
      5,
      { action: 'MUTE' },
    );
  });

  it('throws the error returned by the service', async () => {
    service.updateNotificationPreference.mockResolvedValue(
      err(new NotFoundException('Service package not found.')),
    );

    await expect(
      useCase.execute({
        companyId: 1,
        environmentId: 1,
        serviceId: 1,
        servicePackageId: 999,
        actingUserId: 5,
        dto: { action: 'UNMUTE' },
      }),
    ).rejects.toThrow(NotFoundException);
  });
});

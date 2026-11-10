import { Test, TestingModule } from '@nestjs/testing';
import { PackagesController } from './packages.controller';
import { AddPackagesUseCase } from '../../usecases/addPackages.usecase';
import { GetAllPackagesUseCase } from '../../usecases/getAllPackages.usecase';
import { GetPackageByIdUseCase } from '../../usecases/getPackageById.usecase';
import { DeletePackageByIdUseCase } from '../../usecases/deletePackageById.usecase';
import { UpdatePackagesUseCase } from '../../usecases/updatePackages.usecase';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { RolesGuard } from '@/shared/nest/roles/roles.guard';

describe('PackagesController', () => {
  let controller: PackagesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PackagesController],
      providers: [
        { provide: AddPackagesUseCase, useValue: { execute: jest.fn() } },
        { provide: GetAllPackagesUseCase, useValue: { execute: jest.fn() } },
        { provide: GetPackageByIdUseCase, useValue: { execute: jest.fn() } },
        { provide: DeletePackageByIdUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdatePackagesUseCase, useValue: { execute: jest.fn() } },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PackagesController>(PackagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { UseCase } from '@/modules/shared/types/useCase';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ServerException } from '@/modules/shared/exceptions/ServiceException';
import { PackagesType } from '@/modules/shared/dtos/packages';
import { PackagesService } from '@/modules/shared/services/packages/packages.service';
import { AddNewPackageDomainException } from '@/modules/shared/exceptions/addPackageDomainError';

@Injectable()
export class AddPackagesUseCase implements UseCase<PackagesType, boolean> {
  constructor(private readonly packagesService: PackagesService) {}
  async execute(newPackageData: PackagesType): Promise<boolean> {
    try {
      const packagesServiceResult =
        await this.packagesService.addNewPackage(newPackageData);

      if (packagesServiceResult.isErr()) {
        if (packagesServiceResult.error instanceof ServerException) {
          throw new InternalServerErrorException(packagesServiceResult.error);
        }

        throw new AddNewPackageDomainException(
          'There is an error in the add new package usecase.',
        );
      }

      return packagesServiceResult.value;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `An error occurred while adding a new package.`,
      );
    }
  }
}

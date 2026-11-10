import { UseCase } from '@/modules/shared/types/useCase';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ServerException } from '@/modules/shared/exceptions/ServiceException';
import {
  PackagesType,
  PricingPackageResponse,
} from '@/modules/shared/dtos/packages';
import { PackagesService } from '@/modules/shared/services/packages/packages.service';
import { AddNewPackageDomainException } from '@/modules/shared/exceptions/addPackageDomainError';

export type UpdatePackagesUseCaseProps = {
  packageId: number;
  updatePackageData: PackagesType;
};

@Injectable()
export class UpdatePackagesUseCase implements UseCase<
  UpdatePackagesUseCaseProps,
  PricingPackageResponse
> {
  constructor(private readonly packagesService: PackagesService) {}
  async execute({
    packageId,
    updatePackageData,
  }: UpdatePackagesUseCaseProps): Promise<PricingPackageResponse> {
    try {
      console.log('we are here1');
      const packagesServiceResult = await this.packagesService.updatePackage(
        packageId,
        updatePackageData,
      );

      if (packagesServiceResult.isErr()) {
        if (packagesServiceResult.error instanceof ServerException) {
          throw new InternalServerErrorException(packagesServiceResult.error);
        }

        throw new AddNewPackageDomainException(
          'There is an error in the update package usecase.',
        );
      }

      return packagesServiceResult.value;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `An error occurred while updating a new package.`,
      );
    }
  }
}

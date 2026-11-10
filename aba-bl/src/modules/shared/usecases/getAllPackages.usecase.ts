import { UseCase } from '@/modules/shared/types/useCase';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ServerException } from '@/modules/shared/exceptions/ServiceException';
import { PricingPackageResponse } from '@/modules/shared/dtos/packages';
import { PackagesService } from '@/modules/shared/services/packages/packages.service';
import { GetAllPackageDomainException } from '@/modules/shared/exceptions/getAllPackageDomainError';
@Injectable()
export class GetAllPackagesUseCase implements UseCase<
  null,
  PricingPackageResponse[]
> {
  constructor(private readonly packagesService: PackagesService) {}
  async execute(): Promise<PricingPackageResponse[]> {
    try {
      const packagesServiceResult = await this.packagesService.getAllPackages();

      if (packagesServiceResult.isErr()) {
        if (packagesServiceResult.error instanceof ServerException) {
          throw new InternalServerErrorException(packagesServiceResult.error);
        }

        throw new GetAllPackageDomainException(
          'There is an error in the get all packages usecase.',
        );
      }

      return packagesServiceResult.value;
    } catch (error) {
      throw new InternalServerErrorException(
        `An error occurred while getting package's list: ${error}`,
      );
    }
  }
}

import { UseCase } from '@/modules/shared/types/useCase';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ServerException } from '@/modules/shared/exceptions/ServiceException';
import { PackagesService } from '@/modules/shared/services/packages/packages.service';
import { GetAllPackageDomainException } from '@/modules/shared/exceptions/getAllPackageDomainError';

@Injectable()
export class DeletePackageByIdUseCase implements UseCase<number, boolean> {
  constructor(private readonly packagesService: PackagesService) {}
  async execute(packageId: number): Promise<boolean> {
    try {
      const packagesServiceResult =
        await this.packagesService.deletePackageById(packageId);

      if (packagesServiceResult.isErr()) {
        if (packagesServiceResult.error instanceof ServerException) {
          throw new InternalServerErrorException(packagesServiceResult.error);
        }

        throw new GetAllPackageDomainException(
          'There is an error in the get DeletePackageByIdUseCase usecase.',
        );
      }

      return packagesServiceResult.value;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        `An error occurred while deleting a package.`,
      );
    }
  }
}

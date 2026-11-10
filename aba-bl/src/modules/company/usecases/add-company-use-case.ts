import { UseCase } from '@/modules/shared/types/useCase';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AddUserDomainException } from '@/modules/users/exceptions/AddUserDomainError';
import { ServerException } from '@/modules/shared/exceptions/ServiceException';
import { TRegisterCompany } from '../dtos/addNewCompanyDto';
import { AddNewCompanyService } from '../services/add-new-company/add-new-company.service';

@Injectable()
export class AddCompanyUseCase implements UseCase<
  TRegisterCompany,
  boolean | Error
> {
  constructor(private readonly companyService: AddNewCompanyService) {}

  async execute(request: TRegisterCompany): Promise<boolean | Error> {
    try {
      const result = await this.companyService.addNewCompany(request);
      if (result.isErr()) {
        if (result.error instanceof ServerException) {
          throw new InternalServerErrorException(result.error);
        }
        throw new AddUserDomainException(
          `Failed to add new company: ${result.error.message}`,
        );
      }
      return true;
    } catch (error) {
      if (
        error instanceof AddUserDomainException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        `An error occurred while adding the new company: ${error}`,
      );
    }
  }
}

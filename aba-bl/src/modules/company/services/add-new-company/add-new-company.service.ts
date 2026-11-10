import { TRegisterCompany } from '@/modules/company/dtos/addNewCompanyDto';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { ConflictException, Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { SubscriptionPlanRepository } from '@/modules/subscription-plan/repositories/subscriptionPlan.repository';

@Injectable()
export class AddNewCompanyService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly userRepository: UserRepository,
    private readonly subscriptionPlanRepository: SubscriptionPlanRepository,
  ) {}

  async addNewCompany(
    payload: TRegisterCompany,
  ): Promise<Result<boolean, Error>> {
    try {
      // Step 1: Check for existing company with the same email or name
      const existingCompanyByEmailOrUserName =
        await this.companyRepository.findByEmailOrName(
          payload.email,
          payload.username,
        );

      if (existingCompanyByEmailOrUserName) {
        return err(
          new ConflictException(
            'A company with the same email or username already exists.',
          ),
        );
      }

      // Step 2: Check for existing user with the same email, username, or phone
      const existingUser = await this.userRepository.findByEmailOrPhone(
        payload.email,
        payload.phone,
      );

      if (existingUser) {
        return err(
          new ConflictException(
            'There is a user with the same email, username or phone number in our database.',
          ),
        );
      }

      const salt = 10;
      const hashedPassword = await bcrypt.hash(payload.password, salt);

      const result = await this.createCompanyWithAdminUser(
        payload,
        hashedPassword,
      );

      return ok(result);
    } catch (error: unknown) {
      const IsaPrismaError =
        error && typeof error === 'object' && 'code' in error;
      if (IsaPrismaError && (error as { code: string }).code === 'P2002') {
        // Prisma unique constraint violation
        throw new ConflictException(
          'Unique constraint violation. The company or user already exists.',
        );
      }
      throw error;
    }
  }

  private async createCompanyWithAdminUser(
    payload: TRegisterCompany,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      const defaultPlan = await this.subscriptionPlanRepository.findDefault();
      const companyWithUser = await this.companyRepository.createWithAdminUser({
        ...payload,
        password: hashedPassword,
        subscriptionPlanId: defaultPlan?.id ?? null,
      });

      return !!companyWithUser;
    } catch (error: unknown) {
      const IsaPrismaError =
        error && typeof error === 'object' && 'code' in error;
      if (IsaPrismaError && error.code === 'P2002') {
        // Prisma unique constraint violation
        throw new ConflictException(
          'Unique constraint violation. The company or user already exists.',
        );
      }
      throw error;
    }
  }
}

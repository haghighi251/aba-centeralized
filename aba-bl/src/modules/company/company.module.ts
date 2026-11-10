import { Module } from '@nestjs/common';
import { CompanyController } from '@/modules/company/controllers/add-new-company/add-new-company.controller';
import { AddCompanyUseCase } from '@/modules/company/usecases/add-company-use-case';
import { AddNewCompanyService } from '@/modules/company/services/add-new-company/add-new-company.service';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { SubscriptionPlanRepository } from '@/modules/subscription-plan/repositories/subscriptionPlan.repository';

@Module({
  imports: [],
  controllers: [CompanyController],
  providers: [
    AddCompanyUseCase,
    AddNewCompanyService,
    CompanyRepository,
    UserRepository,
    SubscriptionPlanRepository,
  ],
  exports: [],
})
export class CompanyModule {}

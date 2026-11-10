import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerMiddleware } from '@/shared/middleware/logger.middleware';
import { MailerModule } from '@nestjs-modules/mailer';
import { LoggerModule } from '@/modules/shared/modules/logger/logger.module';
import { UsersController } from '@/modules/users/controllers/users.controller';
import { UsersModule } from '@/modules/users/users.module';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from '@/shared/exceptions/globalExceptionFilter';
import { AuthController } from '@/modules/auth/controllers/auth.controller';
import { AuthService } from '@/modules/auth/services/auth.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { FindCompanyUserByEmailUseCase } from '@/modules/users/usecases/findCompanyUserByEmail.usecase';
import { VerifyGithubIdTokenUseCase } from '@/modules/auth/usecases/verifyGithubIdToken.usecase';
import { GetUserByUsernameOrEmailUseCase } from '@/modules/users/usecases/getUserByUsernameOrEmailUseCase';
import { EmailServerService } from '@/modules/shared/services/emailServerService/emailServerService';
import { SettingsController } from '@/modules/users/controllers/settings/settings.controller';
import { SettingsService } from '@/modules/users/services/settings/settings.service';
import { GetUserByUserIDUseCase } from '@/modules/users/usecases/getUserByUserIDUseCase';
import { GetUserSettingsUseCase } from '@/modules/users/usecases/settings/getUserSettings.usecase';
import { SetUserSettingsUseCase } from '@/modules/users/usecases/settings/setUserSettings.usecase';
import { PackagesService } from './modules/shared/services/packages/packages.service';
import { AdminPackagesModule } from '@/modules/admin/admin.module';
import { PackagesController } from '@/modules/shared/controllers/packages/packages.controller';
import { AddPackagesUseCase } from '@/modules/shared/usecases/addPackages.usecase';
import { GetAllPackagesUseCase } from '@/modules/shared/usecases/getAllPackages.usecase';
import { GetPackageByIdUseCase } from '@/modules/shared/usecases/getPackageById.usecase';
import { DeletePackageByIdUseCase } from '@/modules/shared/usecases/deletePackageById.usecase';
import { UpdatePackagesUseCase } from '@/modules/shared/usecases/updatePackages.usecase';
import { PricingPackageRepository } from '@/modules/shared/repositories/pricingPackage.repository';
import { PrismaModule } from '@/modules/shared/modules/prisma/prisma.module';
import { CompanyModule } from '@/modules/company/company.module';
import { CompanyController } from '@/modules/company/controllers/add-new-company/add-new-company.controller';
import { AddNewCompanyService } from '@/modules/company/services/add-new-company/add-new-company.service';
import { AddCompanyUseCase } from '@/modules/company/usecases/add-company-use-case';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { AdminController } from '@/modules/admin/controllers/admin.controller';
import { CompanyManagementController } from '@/modules/company/controllers/company.controller';
import { EnvironmentModule } from '@/modules/environment/environment.module';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { TeamModule } from '@/modules/team/team.module';
import { TeamRepository } from '@/modules/team/repositories/team.repository';
import { TeamMembershipRepository } from '@/modules/team/repositories/teamMembership.repository';
import { ServiceModule } from '@/modules/service/service.module';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { ServicePackageModule } from '@/modules/service-package/service-package.module';
import { SubscriptionPlanModule } from '@/modules/subscription-plan/subscription-plan.module';
import { SubscriptionPlanRepository } from '@/modules/subscription-plan/repositories/subscriptionPlan.repository';
import { KafkaModule } from '@/modules/kafka/kafka.module';
import { SchedulerModule } from '@/modules/scheduler/scheduler.module';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';
import { RepositoryConnectionModule } from '@/modules/repository-connection/repository-connection.module';
import { WebhookModule } from '@/modules/webhook/webhook.module';
import { TestPageModule } from '@/modules/test-page/test-page.module';
import { TestDefinitionModule } from '@/modules/test-definition/test-definition.module';
import { TestRunModule } from '@/modules/test-run/test-run.module';
import { AiAssistModule } from '@/modules/ai-assist/ai-assist.module';

@Module({
  imports: [
    PrismaModule,
    LoggerModule,
    ScheduleModule.forRoot(),
    KafkaModule,
    UsersModule,
    CompanyModule,
    MailerModule.forRoot({
      transport: {
        host: String(process.env.SMTP_HOST),
        port: Number(process.env.SMTP_PORT),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      defaults: {
        from: process.env.SMTP_USER || 'noreply@example.com',
      },
    }),
    AuthModule,
    AdminPackagesModule,
    TeamModule,
    EnvironmentModule,
    ServiceModule,
    ServicePackageModule,
    SubscriptionPlanModule,
    SchedulerModule,
    RepositoryConnectionModule,
    WebhookModule,
    TestPageModule,
    TestDefinitionModule,
    TestRunModule,
    AiAssistModule,
  ],
  controllers: [
    UsersController,
    AuthController,
    SettingsController,
    PackagesController,
    CompanyController,
    CompanyManagementController,
    AdminController,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    AuthService,
    EmailServerService,
    SettingsService,
    PackagesService,
    PricingPackageRepository,
    AddNewCompanyService,
    FindCompanyUserByEmailUseCase,
    VerifyGithubIdTokenUseCase,
    GetUserByUsernameOrEmailUseCase,
    GetUserByUserIDUseCase,
    GetUserSettingsUseCase,
    SetUserSettingsUseCase,
    AddPackagesUseCase,
    GetAllPackagesUseCase,
    GetPackageByIdUseCase,
    DeletePackageByIdUseCase,
    UpdatePackagesUseCase,
    AddCompanyUseCase,
    CompanyRepository,
    UserRepository,
    TeamRepository,
    TeamMembershipRepository,
    EnvironmentRepository,
    ServiceRepository,
    SubscriptionPlanRepository,
    ActivityLogRepository,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('blog');
  }
}

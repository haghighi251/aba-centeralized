import { Module } from '@nestjs/common';
import { UsersModule } from '@/modules/users/users.module';
import { AuthService } from '@/modules/auth/services/auth.service';
import { AuthController } from '@/modules/auth/controllers/auth.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { jwtConstants } from '@/shared/constants/jwtConstants';
import { FindCompanyUserByEmailUseCase } from '@/modules/users/usecases/findCompanyUserByEmail.usecase';
import { VerifyGithubIdTokenUseCase } from '@/modules/auth/usecases/verifyGithubIdToken.usecase';
import { GetUserByUsernameOrEmailUseCase } from '@/modules/users/usecases/getUserByUsernameOrEmailUseCase';
import { EmailServerService } from '@/modules/shared/services/emailServerService/emailServerService';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.accessSecret,
      signOptions: { expiresIn: jwtConstants.accessTokenExpiresIn },
    }),
  ],
  providers: [
    AuthService,
    JwtService,
    FindCompanyUserByEmailUseCase,
    VerifyGithubIdTokenUseCase,
    GetUserByUsernameOrEmailUseCase,
    EmailServerService,
  ],
  controllers: [AuthController],
})
export class AuthModule {}

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from '@/shared/constants/jwtConstants';
import { FindCompanyUserByEmailUseCase } from '@/modules/users/usecases/findCompanyUserByEmail.usecase';
import { verifyGoogleIdToken } from '@/modules/auth/helpers/verifyGoogleIdToken';
import { ok, Result } from 'neverthrow';
import { AuthSignInResult } from '@/modules/auth/types/AuthSignInResult';
import { verifyGithubAccessToken } from '@/modules/auth/helpers/verifyGithubAccessToken';
import { UserLoginCredentialsDtoSchema } from '@/modules/auth/dtos/UserLoginCredentials';
import { GetUserByUsernameOrEmailUseCase } from '@/modules/users/usecases/getUserByUsernameOrEmailUseCase';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { EmailServerService } from '@/modules/shared/services/emailServerService/emailServerService';
import { User } from '@aba/database';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { refreshTokenPayloadSchema } from '@/modules/auth/types/refreshTokenPayload';
import { GithubUserPayload } from '@/modules/auth/types/GithubUserPayload';
import { mapUserToAuthSignInResult } from '@/modules/auth/helpers/mapUserToAuthSignInResult';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly findCompanyUserByEmailUseCase: FindCompanyUserByEmailUseCase,
    private readonly getUserByUsernameOrEmailUseCase: GetUserByUsernameOrEmailUseCase,
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailServerService,
  ) {}

  private async issueTokens(user: User): Promise<AuthSignInResult> {
    const payload = {
      sub: user.id,
      username: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
    const accessTokenExpires =
      Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtConstants.accessSecret,
        expiresIn: jwtConstants.accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(payload, {
        secret: jwtConstants.refreshSecret,
        expiresIn: jwtConstants.refreshTokenExpiresIn,
      }),
    ]);

    if (!accessToken?.trim() || !refreshToken?.trim()) {
      throw new InternalServerErrorException(
        'Failed to generate access and refresh tokens.',
      );
    }

    return {
      user: mapUserToAuthSignInResult(user),
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpires,
      },
    };
  }

  async signIn(
    credentials: UserLoginCredentialsDtoSchema,
  ): Promise<AuthSignInResult> {
    this.logger.log(
      `[SIGN_IN] username="${credentials.username}" email="${credentials.email}"`,
    );

    const user = await this.getUserByUsernameOrEmailUseCase.execute({
      username: credentials.username,
      email: credentials.email,
    });

    this.logger.log(
      `[SIGN_IN] User found: id=${user.id} email=${user.email} passwordHash="${user.password.substring(0, 10)}..."`,
    );

    const correctPassword = await bcrypt.compare(
      credentials.password,
      user.password,
    );

    this.logger.log(`[SIGN_IN] Password match: ${correctPassword}`);

    if (!correctPassword)
      throw new UnauthorizedException('Username or password is not correct.');

    return this.issueTokens(user);
  }

  async refreshToken(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync(refreshToken, {
      secret: jwtConstants.refreshSecret,
    });

    // Validate with Zod
    const result = refreshTokenPayloadSchema.safeParse(payload);
    if (!result.success) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    const { data: validatedPayload } = result;
    const newPayload = {
      sub: validatedPayload.sub,
      username: validatedPayload.username,
      role: validatedPayload.role,
      companyId: validatedPayload.companyId,
    };

    const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
    const accessTokenExpires =
      Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS;

    const [accessToken, newRefreshToken] = await Promise.all([
      this.jwtService.signAsync(newPayload, {
        secret: jwtConstants.accessSecret,
        expiresIn: jwtConstants.accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(newPayload, {
        secret: jwtConstants.refreshSecret,
        expiresIn: jwtConstants.refreshTokenExpiresIn,
      }),
    ]);

    const isAccessTokenValid =
      typeof accessToken === 'string' && accessToken.trim() !== '';
    const isRefreshTokenValid =
      typeof newRefreshToken === 'string' && newRefreshToken.trim() !== '';

    if (!isAccessTokenValid || !isRefreshTokenValid) {
      throw new InternalServerErrorException(
        'Failed to generate new access and refresh tokens.',
      );
    }

    return {
      accessToken,
      refreshToken: newRefreshToken,
      accessTokenExpires,
    };
  }

  async googleSignIn(idToken: string | undefined): Promise<AuthSignInResult> {
    const isValidToken = typeof idToken === 'string' && idToken.trim() !== '';
    if (!isValidToken) {
      throw new UnauthorizedException('Invalid Google ID token.');
    }

    const payload = await verifyGoogleIdToken(idToken);
    if (!payload || payload instanceof Error) {
      throw new UnauthorizedException('Invalid Google ID token.');
    }

    if (!payload.email) {
      throw new UnauthorizedException(
        'Google account has no email; cannot verify company membership.',
      );
    }

    const user = await this.findCompanyUserByEmailUseCase.execute({
      email: payload.email,
    });

    return this.issueTokens(user);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      // Don't reveal whether the address is registered
      this.logger.warn(`[FORGOT_PASSWORD] No user found for email: ${email}`);
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userRepository.update(user.id, {
      resetToken: token,
      resetTokenExpiry: expiry,
    } as any);

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    this.logger.log(
      `[FORGOT_PASSWORD] ✉️  Reset link for ${email}: ${resetLink}`,
    );

    try {
      await this.emailService.sendPasswordResetEmail(email, resetLink);
      this.logger.log(`[FORGOT_PASSWORD] Email sent to ${email}`);
    } catch (err) {
      this.logger.warn(
        `[FORGOT_PASSWORD] Email delivery failed (check SMTP): ${(err as Error).message}`,
      );
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByResetToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token.');
    }

    const expiry: Date | null = (user as any).resetTokenExpiry;
    if (!expiry || expiry < new Date()) {
      throw new BadRequestException('Reset token has expired.');
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.userRepository.update(user.id, {
      password: hashed,
      resetToken: null,
      resetTokenExpiry: null,
    } as any);

    this.logger.log(`[RESET_PASSWORD] Password updated for user id=${user.id}`);
  }

  async githubSignIn(
    idToken: string | undefined,
  ): Promise<Result<AuthSignInResult, Error>> {
    const isValidToken = typeof idToken === 'string' && idToken.trim() !== '';
    if (!isValidToken) {
      throw new UnauthorizedException('Invalid Github ID token.');
    }

    const payload = await verifyGithubAccessToken(idToken);
    const { email } = payload as GithubUserPayload;

    if (!email) {
      throw new UnauthorizedException(
        'GitHub account has no public email; cannot verify company membership.',
      );
    }

    const user = await this.findCompanyUserByEmailUseCase.execute({ email });

    return ok(await this.issueTokens(user));
  }
}

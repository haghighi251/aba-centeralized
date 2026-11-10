import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Request,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from '@/modules/auth/services/auth.service';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { IdToken } from '@/modules/auth/types/IdToken';
import { createResponse } from '@/shared/utils/createResponse';
import { VerifyGithubIdTokenUseCase } from '@/modules/auth/usecases/verifyGithubIdToken.usecase';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import {
  UserLoginCredentialsDto,
  UserLoginCredentialsDtoSchema,
} from '@/modules/auth/dtos/UserLoginCredentials';
import {
  ForgotPasswordDto,
  ForgotPasswordDtoSchema,
} from '@/modules/auth/dtos/ForgotPasswordDto';
import {
  ResetPasswordDto,
  ResetPasswordDtoSchema,
} from '@/modules/auth/dtos/ResetPasswordDto';
import {
  RefreshTokenDto,
  RefreshTokenDtoSchema,
} from '@/modules/auth/dtos/RefreshTokenDto';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';

const authSignInResultSchema = apiResponseSchema({
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        companyId: { type: 'string' },
      },
    },
    tokens: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        accessTokenExpires: { type: 'number' },
      },
    },
  },
});

const refreshTokenResultSchema = apiResponseSchema({
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    accessTokenExpires: { type: 'number' },
  },
});

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly verifyGithubIdTokenUseCase: VerifyGithubIdTokenUseCase,
  ) {}

  @ApiOperation({
    summary: 'Sign in with username/email and password',
    description:
      'Authenticates a company user with their username or email and password, ' +
      'returning an access/refresh token pair.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['password'],
      properties: {
        username: { type: 'string', minLength: 3 },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 8 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Signed in successfully.',
    schema: authSignInResultSchema,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @HttpCode(HttpStatus.OK)
  @Post('/login')
  @UsePipes(new ZodValidationPipe(UserLoginCredentialsDto))
  async signIn(@Body() credentials: UserLoginCredentialsDtoSchema) {
    this.logger.log(
      `[LOGIN] username="${credentials.username}" email="${credentials.email}"`,
    );
    const result = await this.authService.signIn(credentials);
    return createResponse(true, null, result);
  }

  @ApiOperation({
    summary: 'Refresh an access token',
    description:
      'Exchanges a valid refresh token for a new access/refresh token pair.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: { refreshToken: { type: 'string' } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully.',
    schema: refreshTokenResultSchema,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token.',
  })
  @HttpCode(HttpStatus.OK)
  @Post('/refresh')
  @UsePipes(new ZodValidationPipe(RefreshTokenDto))
  async refresh(@Body() refreshTokenDto: RefreshTokenDtoSchema) {
    const result = await this.authService.refreshToken(
      refreshTokenDto.refreshToken,
    );
    return createResponse(true, null, result);
  }

  @ApiOperation({
    summary: 'Get a CSRF token',
    description:
      'Issues a CSRF token tied to a signed cookie, for use with state-changing cookie-based requests.',
  })
  @ApiResponse({
    status: 200,
    description: 'CSRF token issued.',
    schema: apiResponseSchema({ type: 'string' }),
  })
  @Get('/csrf-token')
  @HttpCode(HttpStatus.OK)
  getCsrfToken(@Request() req) {
    // Calling req.csrfToken() generates the secret, sets the signed cookie, and returns the token
    const csrfToken = req.csrfToken();
    // const secret = req.signedCookies?._csrf;
    console.log('Generating CSRF token for request:', req.path);

    return createResponse(true, null, csrfToken);
  }

  @ApiOperation({
    summary: 'Sign in with Google',
    description:
      'Verifies a Google ID token and signs in the matching company user. ' +
      'Rejects the request if the email is not registered to any company.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id_token'],
      properties: { id_token: { type: 'string' } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Signed in successfully.',
    schema: authSignInResultSchema,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid token, or email not associated with any company.',
  })
  @HttpCode(HttpStatus.OK)
  @Post('/google')
  async googleSignIn(@Body() token: IdToken) {
    const result = await this.authService.googleSignIn(token.id_token);

    console.log('Google Sign-In result:', result);
    return createResponse(true, null, result);
  }

  @ApiOperation({
    summary: 'Sign in with GitHub',
    description:
      'Verifies a GitHub access token and signs in the matching company user. ' +
      'Rejects the request if the email is not registered to any company, ' +
      'or if the GitHub account has no public email.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id_token'],
      properties: { id_token: { type: 'string' } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Signed in successfully.',
    schema: authSignInResultSchema,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid token, or email not associated with any company.',
  })
  @HttpCode(HttpStatus.OK)
  @Post('/github')
  async verifyGithubIdToken(@Body() id_token: IdToken) {
    const result = await this.verifyGithubIdTokenUseCase.execute(id_token);

    console.log('GitHub Sign-In result:', result);
    return createResponse(true, null, result);
  }

  @ApiOperation({
    summary: 'Request a password reset email',
    description:
      'Sends a password reset link to the given email if it belongs to a registered user. ' +
      'Always returns success to avoid leaking whether the email is registered.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: { email: { type: 'string', format: 'email' } },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Request accepted.',
    schema: apiResponseSchema({ type: 'string' }),
  })
  @HttpCode(HttpStatus.OK)
  @Post('/forgot-password')
  @UsePipes(new ZodValidationPipe(ForgotPasswordDto))
  async forgotPassword(@Body() dto: ForgotPasswordDtoSchema) {
    await this.authService.forgotPassword(dto.email);
    // Always return success to avoid leaking whether the email is registered
    return createResponse(
      true,
      null,
      'If that email is registered you will receive a reset link shortly.',
    );
  }

  @ApiOperation({
    summary: 'Reset a password using a reset token',
    description:
      'Sets a new password for the user identified by the given reset token.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['token', 'password'],
      properties: {
        token: { type: 'string' },
        password: { type: 'string', minLength: 8 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully.',
    schema: apiResponseSchema({ type: 'string' }),
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token.' })
  @HttpCode(HttpStatus.OK)
  @Post('/reset-password')
  @UsePipes(new ZodValidationPipe(ResetPasswordDto))
  async resetPassword(@Body() dto: ResetPasswordDtoSchema) {
    await this.authService.resetPassword(dto.token, dto.password);
    return createResponse(true, null, 'Password updated successfully.');
  }

  // Protected routes

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get the current user profile',
    description: 'Returns the JWT payload of the currently authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Authenticated user payload.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @UseGuards(AuthGuard)
  @Get('/profile')
  getProfile(@Request() req) {
    return req.user;
  }
}

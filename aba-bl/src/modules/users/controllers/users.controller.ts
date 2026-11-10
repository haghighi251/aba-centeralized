import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@/shared/nest/roles/roles.decorator';
import { Role } from '@/shared/types/user.roles';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { RolesGuard } from '@/shared/nest/roles/roles.guard';
import { EmailServerService } from '@/modules/shared/services/emailServerService/emailServerService';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  roles: Role[];
  constructor(private readonly emailServerService: EmailServerService) {}

  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all users',
    description:
      'Returns all users on the platform. Restricted to platform admins.',
  })
  @ApiResponse({ status: 200, description: 'List of users.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  @ApiResponse({
    status: 403,
    description: 'User does not have the Admin role.',
  })
  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.Admin)
  getAllUsers(): string {
    return 'This action returns all users';
  }

  @ApiOperation({
    summary: 'Get a user by id',
    description: 'Returns the id of the requested user.',
  })
  @ApiParam({ name: 'id', description: 'User id.' })
  @ApiResponse({ status: 200, description: 'User id.' })
  @Get(':id')
  getUser(@Param() id: string): string {
    const userId = id;
    return userId;
  }

  @ApiOperation({
    summary: 'Send a test email',
    description:
      'Sends a sample welcome email using the configured email server.',
  })
  @ApiResponse({ status: 201, description: 'Email sent.' })
  @Post('/email')
  async sendEmail() {
    await this.emailServerService.sendMail({
      template:
        '/contexts/shared/infrastructure/utils/EmailTemplate/mailTemplate.pug',
      dataTemplate: 'JohnDoe', // Data that will be injected into the template
      to: 'haghighi251@gmail.com', // The recipient's email address
      subject: 'Welcome to Our Service!', // The subject of the email
      text: 'Hello JohnDoe, welcome to our service! Please confirm your email by clicking the link.', // Plain text version of the email
    });
  }
}

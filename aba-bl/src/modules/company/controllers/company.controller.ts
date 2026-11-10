import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse as ApiResponseDecorator,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { CompanyAccessGuard } from '@/modules/company/guards/company-access.guard';
import { CompanyManagerGuard } from '@/modules/company/guards/company-manager.guard';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import { TeamRepository } from '@/modules/team/repositories/team.repository';
import { TeamMembershipRepository } from '@/modules/team/repositories/teamMembership.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import {
  UpdateCompanyDto,
  UpdateCompanyDtoSchema,
} from '@/modules/company/dtos/UpdateCompanyDto';
import {
  AddCompanyUserDto,
  AddCompanyUserDtoSchema,
} from '@/modules/company/dtos/AddCompanyUserDto';
import {
  UpdateCompanyUserDto,
  UpdateCompanyUserDtoSchema,
} from '@/modules/company/dtos/UpdateCompanyUserDto';
import { createResponse } from '@/shared/utils/createResponse';
import { ApiResponse } from '@/shared/types/apiResponse';
import { Company, User } from '@aba/database';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';

type SafeUser = Omit<User, 'password' | 'resetToken' | 'resetTokenExpiry'> & {
  teams: { id: number; name: string }[];
};

const companySchema = { type: 'object' };
const companyStatsSchema = {
  type: 'object',
  properties: {
    teamsCount: { type: 'number' },
    environmentsCount: { type: 'number' },
    servicesCount: { type: 'number' },
  },
};
const safeUserSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    email: { type: 'string' },
    firstName: { type: 'string', nullable: true },
    lastName: { type: 'string', nullable: true },
    role: { type: 'string' },
    companyId: { type: 'number' },
    teams: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'number' }, name: { type: 'string' } },
      },
    },
  },
};

@ApiTags('Company')
@ApiBearerAuth()
@Controller('company')
@UseGuards(AuthGuard)
export class CompanyManagementController {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly userRepository: UserRepository,
    private readonly teamRepository: TeamRepository,
    private readonly teamMembershipRepository: TeamMembershipRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly serviceRepository: ServiceRepository,
  ) {}

  // ── Company details ──────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Get company details',
    description:
      'Returns the company record for the given id. The caller must belong to that company.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Company details.',
    schema: apiResponseSchema(companySchema),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({ status: 404, description: 'Company not found.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  @UseGuards(CompanyAccessGuard)
  async getCompany(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<Company>> {
    const company = await this.companyRepository.findById(id);
    if (!company) throw new NotFoundException('Company not found.');
    return createResponse(true, null, company);
  }

  @ApiOperation({
    summary: 'Get company dashboard stats',
    description:
      'Returns counts of teams and environments belonging to the company, ' +
      'for display on the dashboard. The caller must belong to that company.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Company dashboard stats.',
    schema: apiResponseSchema(companyStatsSchema),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller does not belong to this company.',
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id/stats')
  @UseGuards(CompanyAccessGuard)
  async getCompanyStats(@Param('id', ParseIntPipe) id: number): Promise<
    ApiResponse<{
      teamsCount: number;
      environmentsCount: number;
      servicesCount: number;
    }>
  > {
    const [teamsCount, environmentsCount, servicesCount] = await Promise.all([
      this.teamRepository.countForCompany(id),
      this.environmentRepository.countForCompany(id),
      this.serviceRepository.countForCompany(id),
    ]);
    return createResponse(true, null, {
      teamsCount,
      environmentsCount,
      servicesCount,
    });
  }

  @ApiOperation({
    summary: 'Update company details',
    description:
      'Updates the company record. Restricted to company managers (owner/admin).',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        website: { type: 'string', format: 'uri' },
        address: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        country: { type: 'string' },
        postalCode: { type: 'string' },
      },
    },
  })
  @ApiResponseDecorator({
    status: 200,
    description: 'Company updated.',
    schema: apiResponseSchema(companySchema),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller is not a company manager.',
  })
  @HttpCode(HttpStatus.OK)
  @Put(':id')
  @UseGuards(CompanyManagerGuard)
  async updateCompany(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateCompanyDto)) dto: UpdateCompanyDtoSchema,
  ): Promise<ApiResponse<Company>> {
    const updated = await this.companyRepository.update(id, dto);
    return createResponse(true, null, updated);
  }

  // ── Company users ─────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'List company users',
    description:
      'Returns all users belonging to the given company, with password/reset fields ' +
      "stripped and each user's team links included. Any authenticated member of the " +
      'company (including BUSINESS_MEMBER) can view this list read-only.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiResponseDecorator({
    status: 200,
    description: 'List of company users.',
    schema: apiResponseSchema({ type: 'array', items: safeUserSchema }),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller does not belong to this company.',
  })
  @HttpCode(HttpStatus.OK)
  @Get(':id/users')
  @UseGuards(CompanyAccessGuard)
  async getUsers(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ApiResponse<SafeUser[]>> {
    const users = await this.userRepository.findAllByCompany(id);
    // Strip password hashes and flatten team memberships before returning
    const safe = users.map(
      ({ password, resetToken, resetTokenExpiry, teamMemberships, ...u }) => ({
        ...u,
        teams: teamMemberships.map((tm) => tm.team),
      }),
    );
    return createResponse(true, null, safe);
  }

  @ApiOperation({
    summary: 'Add a user to the company',
    description:
      'Creates a new user under the given company. BUSINESS_ADMIN callers may only ' +
      'add BUSINESS_MEMBER users. An optional teamIds list links the new user to one ' +
      "or more of the company's teams.",
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'role', 'password'],
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        role: { type: 'string', enum: ['BUSINESS_ADMIN', 'BUSINESS_MEMBER'] },
        password: { type: 'string', minLength: 8 },
        teamIds: { type: 'array', items: { type: 'number' } },
      },
    },
  })
  @ApiResponseDecorator({
    status: 201,
    description: 'User created.',
    schema: apiResponseSchema(safeUserSchema),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller is not authorized to add this role.',
  })
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/users')
  @UseGuards(CompanyManagerGuard)
  async addUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddCompanyUserDtoSchema,
    @Request() req,
  ): Promise<ApiResponse<SafeUser>> {
    new ZodValidationPipe(AddCompanyUserDto).transform(dto, { type: 'body' });

    const callerRole: string = req['user'].role;

    // BUSINESS_ADMIN can only add BUSINESS_MEMBER
    if (callerRole === 'BUSINESS_ADMIN' && dto.role === 'BUSINESS_ADMIN') {
      throw new ForbiddenException('Business admins can only add members.');
    }

    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ForbiddenException('A user with that email already exists.');
    }

    const teams = await this.resolveTeamsForCompany(id, dto.teamIds ?? []);

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepository.createInCompany({
      email: dto.email,
      password: hashed,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      role: dto.role as any,
      companyId: id,
    });

    for (const team of teams) {
      await this.teamMembershipRepository.create({
        user: { connect: { id: user.id } },
        team: { connect: { id: team.id } },
      });
    }

    const { password, resetToken, resetTokenExpiry, ...safe } = user;
    return createResponse(true, null, { ...safe, teams });
  }

  /**
   * Resolves teamIds to Team records scoped to this company, throwing
   * NotFoundException on the first id that doesn't belong to it.
   */
  private async resolveTeamsForCompany(
    companyId: number,
    teamIds: number[],
  ): Promise<{ id: number; name: string }[]> {
    const teams: { id: number; name: string }[] = [];
    for (const teamId of teamIds) {
      const team = await this.teamRepository.findById(teamId);
      if (!team || team.companyId !== companyId) {
        throw new NotFoundException(
          `Team ${teamId} not found in this company.`,
        );
      }
      teams.push({ id: team.id, name: team.name });
    }
    return teams;
  }

  @ApiOperation({
    summary: "Update a company user's profile/role/teams",
    description:
      'Updates first/last name, role, and/or team links for a user in the company. ' +
      'BUSINESS_ADMIN callers cannot modify admin/owner users or assign the admin role. ' +
      "When teamIds is provided it replaces the user's full set of team links.",
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'userId', type: 'number', description: 'User id.' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        role: { type: 'string', enum: ['BUSINESS_ADMIN', 'BUSINESS_MEMBER'] },
        teamIds: { type: 'array', items: { type: 'number' } },
      },
    },
  })
  @ApiResponseDecorator({
    status: 200,
    description: 'User updated.',
    schema: apiResponseSchema(safeUserSchema),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller is not authorized to modify this user.',
  })
  @ApiResponseDecorator({
    status: 404,
    description: 'User not found in this company.',
  })
  @HttpCode(HttpStatus.OK)
  @Put(':id/users/:userId')
  @UseGuards(CompanyManagerGuard)
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateCompanyUserDtoSchema,
    @Request() req,
  ): Promise<ApiResponse<SafeUser>> {
    new ZodValidationPipe(UpdateCompanyUserDto).transform(dto, {
      type: 'body',
    });

    const callerRole: string = req['user'].role;
    const target = await this.userRepository.findById(userId);

    if (!target || target.companyId !== id) {
      throw new NotFoundException('User not found in this company.');
    }

    // The owner role is never reassignable through this endpoint, by anyone
    // (including the owner themselves) — matches AddCompanyUserDto/
    // UpdateCompanyUserDto never accepting 'BUSINESS_OWNER' as a settable role.
    if (target.role === 'BUSINESS_OWNER' && dto.role !== undefined) {
      throw new ForbiddenException('Cannot change the owner role.');
    }

    // BUSINESS_ADMIN cannot promote/demote BUSINESS_ADMIN or BUSINESS_OWNER
    if (callerRole === 'BUSINESS_ADMIN') {
      if (
        target.role === 'BUSINESS_OWNER' ||
        target.role === 'BUSINESS_ADMIN'
      ) {
        throw new ForbiddenException('Cannot modify admin or owner users.');
      }
      if (dto.role === 'BUSINESS_ADMIN') {
        throw new ForbiddenException('Cannot assign admin role.');
      }
    }

    // Resolve/validate teamIds before mutating anything, so a bad id fails
    // fast without leaving a partial (name/role updated, teams not) change.
    const desiredTeams =
      dto.teamIds !== undefined
        ? await this.resolveTeamsForCompany(id, dto.teamIds)
        : undefined;

    const updated = await this.userRepository.update(userId, {
      ...(dto.firstName !== undefined && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
      ...(dto.role !== undefined && { role: dto.role as any }),
    });

    const currentMemberships =
      await this.teamMembershipRepository.findAllForUser(userId);

    let teams: { id: number; name: string }[];
    if (desiredTeams !== undefined) {
      const desired = desiredTeams;
      const currentIds = new Set(currentMemberships.map((m) => m.teamId));
      const desiredIds = new Set(desired.map((t) => t.id));

      const toAdd = desired.filter((t) => !currentIds.has(t.id));
      const toRemove = [...currentIds].filter((tid) => !desiredIds.has(tid));

      for (const team of toAdd) {
        await this.teamMembershipRepository.create({
          user: { connect: { id: userId } },
          team: { connect: { id: team.id } },
        });
      }
      if (toRemove.length > 0) {
        await this.teamMembershipRepository.removeManyForUser(userId, toRemove);
      }
      teams = desired;
    } else {
      teams = currentMemberships.map((m) => m.team);
    }

    const { password, resetToken, resetTokenExpiry, ...safe } = updated;
    return createResponse(true, null, { ...safe, teams });
  }

  @ApiOperation({
    summary: 'Remove a user from the company',
    description:
      'Deletes a user from the company. Callers cannot remove themselves, and ' +
      'BUSINESS_ADMIN callers cannot remove admin/owner users.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'userId', type: 'number', description: 'User id.' })
  @ApiResponseDecorator({
    status: 200,
    description: 'User removed.',
    schema: apiResponseSchema({ type: 'object', nullable: true }),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller is not authorized to remove this user.',
  })
  @ApiResponseDecorator({
    status: 404,
    description: 'User not found in this company.',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id/users/:userId')
  @UseGuards(CompanyManagerGuard)
  async removeUser(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req,
  ) {
    const callerRole: string = req['user'].role;
    const callerId: number = req['user'].sub;
    const target = await this.userRepository.findById(userId);

    if (!target || target.companyId !== id) {
      throw new NotFoundException('User not found in this company.');
    }
    if (target.id === callerId) {
      throw new ForbiddenException('Cannot remove yourself.');
    }
    if (
      callerRole === 'BUSINESS_ADMIN' &&
      (target.role === 'BUSINESS_OWNER' || target.role === 'BUSINESS_ADMIN')
    ) {
      throw new ForbiddenException('Cannot remove admin or owner users.');
    }

    await this.userRepository.delete(userId);
    return createResponse(true, null, null);
  }
}

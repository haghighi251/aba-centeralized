import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse as ApiResponseDecorator,
  ApiTags,
} from '@nestjs/swagger';
import { Team, TeamMembership } from '@aba/database';
import { AuthGuard } from '@/modules/auth/guards/auth.guard';
import { CompanyAccessGuard } from '@/modules/company/guards/company-access.guard';
import { CompanyManagerGuard } from '@/modules/company/guards/company-manager.guard';
import { ZodValidationPipe } from '@/shared/nest/pipes/validation.pipe';
import { createResponse } from '@/shared/utils/createResponse';
import { ApiResponse } from '@/shared/types/apiResponse';
import { apiResponseSchema } from '@/shared/swagger/apiResponseSchema';
import {
  CreateTeamDto,
  CreateTeamDtoSchema,
} from '@/modules/team/dtos/CreateTeamDto';
import {
  UpdateTeamDto,
  UpdateTeamDtoSchema,
} from '@/modules/team/dtos/UpdateTeamDto';
import {
  TeamFilterDto,
  TeamFilterDtoSchema,
} from '@/modules/team/dtos/teamFilter';
import { CreateTeamUseCase } from '@/modules/team/usecases/createTeam.usecase';
import { GetTeamsUseCase } from '@/modules/team/usecases/getTeams.usecase';
import { GetTeamByIdUseCase } from '@/modules/team/usecases/getTeamById.usecase';
import { UpdateTeamUseCase } from '@/modules/team/usecases/updateTeam.usecase';
import { DeleteTeamUseCase } from '@/modules/team/usecases/deleteTeam.usecase';
import { GetTeamMembersUseCase } from '@/modules/team/usecases/getTeamMembers.usecase';
import { AddTeamMemberUseCase } from '@/modules/team/usecases/addTeamMember.usecase';
import { RemoveTeamMemberUseCase } from '@/modules/team/usecases/removeTeamMember.usecase';
import {
  AddTeamMemberDto,
  AddTeamMemberDtoSchema,
} from '@/modules/team/dtos/AddTeamMemberDto';
import { TeamMembershipWithUser } from '@/modules/team/repositories/teamMembership.repository';

const teamSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
    companyId: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const teamListSchema = {
  type: 'object',
  properties: {
    data: { type: 'array', items: teamSchema },
    total: { type: 'number' },
  },
};

const createTeamBody = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', example: 'Platform' },
    slug: {
      type: 'string',
      example: 'platform',
      description:
        'Lowercase, hyphenated identifier. Derived from name if omitted.',
    },
    description: { type: 'string', nullable: true },
  },
};

const updateTeamBody = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string', nullable: true },
    status: { type: 'string', enum: ['ACTIVE', 'ARCHIVED'] },
  },
};

const teamMemberSchema = {
  type: 'object',
  properties: {
    id: { type: 'number' },
    userId: { type: 'number' },
    teamId: { type: 'number' },
    createdAt: { type: 'string', format: 'date-time' },
    user: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        firstName: { type: 'string', nullable: true },
        lastName: { type: 'string', nullable: true },
        email: { type: 'string' },
        role: {
          type: 'string',
          enum: [
            'SUPER_ADMIN',
            'ADMIN',
            'BUSINESS_OWNER',
            'BUSINESS_ADMIN',
            'BUSINESS_MEMBER',
          ],
        },
      },
    },
  },
};

const addTeamMemberBody = {
  type: 'object',
  required: ['userId'],
  properties: {
    userId: { type: 'number', example: 42 },
  },
};

@ApiTags('Team')
@ApiBearerAuth()
@Controller('company')
@UseGuards(AuthGuard)
export class TeamController {
  constructor(
    private readonly createTeamUseCase: CreateTeamUseCase,
    private readonly getTeamsUseCase: GetTeamsUseCase,
    private readonly getTeamByIdUseCase: GetTeamByIdUseCase,
    private readonly updateTeamUseCase: UpdateTeamUseCase,
    private readonly deleteTeamUseCase: DeleteTeamUseCase,
    private readonly getTeamMembersUseCase: GetTeamMembersUseCase,
    private readonly addTeamMemberUseCase: AddTeamMemberUseCase,
    private readonly removeTeamMemberUseCase: RemoveTeamMemberUseCase,
  ) {}

  @ApiOperation({
    summary: 'List teams for a company',
    description:
      'Returns all teams belonging to the company. Any authenticated member ' +
      'of the company (including BUSINESS_MEMBER) can view this list.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Filters by name/slug.',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'ARCHIVED'] })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['name', 'createdAt'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponseDecorator({
    status: 200,
    description: 'List of teams.',
    schema: apiResponseSchema(teamListSchema),
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
  @Get(':id/teams')
  @UseGuards(CompanyAccessGuard)
  async getTeams(
    @Param('id', ParseIntPipe) companyId: number,
    @Query(new ZodValidationPipe(TeamFilterDto))
    query: TeamFilterDtoSchema,
  ): Promise<ApiResponse<{ data: Team[]; total: number }>> {
    const result = await this.getTeamsUseCase.execute({
      companyId,
      ...query,
    });
    return createResponse(true, null, result);
  }

  @ApiOperation({
    summary: 'Get a single team',
    description:
      'Returns a single team by id. Any authenticated member of the company ' +
      '(including BUSINESS_MEMBER) can view it.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'teamId', type: 'number', description: 'Team id.' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Team details.',
    schema: apiResponseSchema(teamSchema),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller does not belong to this company.',
  })
  @ApiResponseDecorator({ status: 404, description: 'Team not found.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id/teams/:teamId')
  @UseGuards(CompanyAccessGuard)
  async getTeam(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<ApiResponse<Team>> {
    const team = await this.getTeamByIdUseCase.execute({
      companyId,
      teamId,
    });
    return createResponse(true, null, team);
  }

  @ApiOperation({
    summary: 'Create a new team',
    description:
      'Creates a new team for the company. Restricted to BUSINESS_OWNER and ' +
      'BUSINESS_ADMIN. BUSINESS_MEMBER callers receive a 403 Forbidden.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiBody({ schema: createTeamBody })
  @ApiResponseDecorator({
    status: 201,
    description: 'Team created.',
    schema: apiResponseSchema(teamSchema),
  })
  @ApiResponseDecorator({ status: 400, description: 'Validation error.' })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller is not a company manager.',
  })
  @ApiResponseDecorator({
    status: 409,
    description: 'A team with this slug or name already exists.',
  })
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/teams')
  @UseGuards(CompanyManagerGuard)
  async createTeam(
    @Param('id', ParseIntPipe) companyId: number,
    @Body(new ZodValidationPipe(CreateTeamDto))
    dto: CreateTeamDtoSchema,
  ): Promise<ApiResponse<Team>> {
    const team = await this.createTeamUseCase.execute({
      companyId,
      dto,
    });
    return createResponse(true, null, team);
  }

  @ApiOperation({
    summary: 'Update a team',
    description:
      'Updates a team for the company. Restricted to BUSINESS_OWNER and ' +
      'BUSINESS_ADMIN. BUSINESS_MEMBER callers receive a 403 Forbidden.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'teamId', type: 'number', description: 'Team id.' })
  @ApiBody({ schema: updateTeamBody })
  @ApiResponseDecorator({
    status: 200,
    description: 'Team updated.',
    schema: apiResponseSchema(teamSchema),
  })
  @ApiResponseDecorator({ status: 400, description: 'Validation error.' })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller is not a company manager.',
  })
  @ApiResponseDecorator({ status: 404, description: 'Team not found.' })
  @ApiResponseDecorator({
    status: 409,
    description: 'A team with this slug or name already exists.',
  })
  @HttpCode(HttpStatus.OK)
  @Put(':id/teams/:teamId')
  @UseGuards(CompanyManagerGuard)
  async updateTeam(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('teamId', ParseIntPipe) teamId: number,
    @Body(new ZodValidationPipe(UpdateTeamDto))
    dto: UpdateTeamDtoSchema,
  ): Promise<ApiResponse<Team>> {
    const team = await this.updateTeamUseCase.execute({
      companyId,
      teamId,
      dto,
    });
    return createResponse(true, null, team);
  }

  @ApiOperation({
    summary: 'Delete a team',
    description:
      'Permanently deletes a team from the company, including all of its ' +
      'environments and their services (cascade delete). Restricted to ' +
      'BUSINESS_OWNER and BUSINESS_ADMIN. BUSINESS_MEMBER callers receive a ' +
      '403 Forbidden.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'teamId', type: 'number', description: 'Team id.' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Team deleted.',
    schema: apiResponseSchema(teamSchema),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller is not a company manager.',
  })
  @ApiResponseDecorator({ status: 404, description: 'Team not found.' })
  @HttpCode(HttpStatus.OK)
  @Delete(':id/teams/:teamId')
  @UseGuards(CompanyManagerGuard)
  async deleteTeam(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<ApiResponse<Team>> {
    const team = await this.deleteTeamUseCase.execute({
      companyId,
      teamId,
    });
    return createResponse(true, null, team);
  }

  // ── GET /teams/:teamId/members ─────────────────────────────────────────────

  @ApiOperation({
    summary: "List a team's members",
    description:
      'Returns every user linked to this team, regardless of role. Any ' +
      'authenticated member of the company (including BUSINESS_MEMBER) can ' +
      'view this list. Team-linked BUSINESS_ADMIN users are the ones who ' +
      "receive that team's services' vulnerability notification digests.",
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'teamId', type: 'number', description: 'Team id.' })
  @ApiResponseDecorator({
    status: 200,
    description: 'Team member list.',
    schema: apiResponseSchema({ type: 'array', items: teamMemberSchema }),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller does not belong to this company.',
  })
  @ApiResponseDecorator({ status: 404, description: 'Team not found.' })
  @HttpCode(HttpStatus.OK)
  @Get(':id/teams/:teamId/members')
  @UseGuards(CompanyAccessGuard)
  async getTeamMembers(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('teamId', ParseIntPipe) teamId: number,
  ): Promise<ApiResponse<TeamMembershipWithUser[]>> {
    const members = await this.getTeamMembersUseCase.execute({
      companyId,
      teamId,
    });
    return createResponse(true, null, members);
  }

  // ── POST /teams/:teamId/members ────────────────────────────────────────────

  @ApiOperation({
    summary: 'Link a user to a team',
    description:
      'Assigns an existing company user to this team. Any role can be ' +
      'linked (this is a general-purpose assignment, e.g. for onboarding a ' +
      'new user into their team) — but only BUSINESS_ADMIN members receive ' +
      "that team's services' notification digests. Restricted to " +
      'BUSINESS_OWNER and BUSINESS_ADMIN.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'teamId', type: 'number', description: 'Team id.' })
  @ApiBody({ schema: addTeamMemberBody })
  @ApiResponseDecorator({
    status: 201,
    description: 'User linked to the team.',
    schema: apiResponseSchema(teamMemberSchema),
  })
  @ApiResponseDecorator({ status: 400, description: 'Validation error.' })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller is not a company manager.',
  })
  @ApiResponseDecorator({
    status: 404,
    description: 'Team not found, or user not found in this company.',
  })
  @ApiResponseDecorator({
    status: 409,
    description: 'User is already a member of this team.',
  })
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/teams/:teamId/members')
  @UseGuards(CompanyManagerGuard)
  async addTeamMember(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('teamId', ParseIntPipe) teamId: number,
    @Body(new ZodValidationPipe(AddTeamMemberDto)) dto: AddTeamMemberDtoSchema,
  ): Promise<ApiResponse<TeamMembership>> {
    const membership = await this.addTeamMemberUseCase.execute({
      companyId,
      teamId,
      dto,
    });
    return createResponse(true, null, membership);
  }

  // ── DELETE /teams/:teamId/members/:userId ──────────────────────────────────

  @ApiOperation({
    summary: 'Unlink a user from a team',
    description:
      'Removes a user from this team. Restricted to BUSINESS_OWNER and ' +
      'BUSINESS_ADMIN.',
  })
  @ApiParam({ name: 'id', type: 'number', description: 'Company id.' })
  @ApiParam({ name: 'teamId', type: 'number', description: 'Team id.' })
  @ApiParam({ name: 'userId', type: 'number', description: 'User id.' })
  @ApiResponseDecorator({
    status: 200,
    description: 'User unlinked from the team.',
    schema: apiResponseSchema(teamMemberSchema),
  })
  @ApiResponseDecorator({
    status: 401,
    description: 'Missing or invalid bearer token.',
  })
  @ApiResponseDecorator({
    status: 403,
    description: 'Caller is not a company manager.',
  })
  @ApiResponseDecorator({
    status: 404,
    description: 'Team not found, or user is not a member of this team.',
  })
  @HttpCode(HttpStatus.OK)
  @Delete(':id/teams/:teamId/members/:userId')
  @UseGuards(CompanyManagerGuard)
  async removeTeamMember(
    @Param('id', ParseIntPipe) companyId: number,
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<ApiResponse<TeamMembership>> {
    const membership = await this.removeTeamMemberUseCase.execute({
      companyId,
      teamId,
      userId,
    });
    return createResponse(true, null, membership);
  }
}

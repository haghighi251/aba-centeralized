import { Module } from '@nestjs/common';
import { TeamController } from '@/modules/team/controllers/team.controller';
import { TeamRepository } from '@/modules/team/repositories/team.repository';
import { TeamMembershipRepository } from '@/modules/team/repositories/teamMembership.repository';
import { TeamService } from '@/modules/team/services/team.service';
import { TeamMembershipService } from '@/modules/team/services/teamMembership.service';
import { CreateTeamUseCase } from '@/modules/team/usecases/createTeam.usecase';
import { GetTeamsUseCase } from '@/modules/team/usecases/getTeams.usecase';
import { GetTeamByIdUseCase } from '@/modules/team/usecases/getTeamById.usecase';
import { UpdateTeamUseCase } from '@/modules/team/usecases/updateTeam.usecase';
import { DeleteTeamUseCase } from '@/modules/team/usecases/deleteTeam.usecase';
import { GetTeamMembersUseCase } from '@/modules/team/usecases/getTeamMembers.usecase';
import { AddTeamMemberUseCase } from '@/modules/team/usecases/addTeamMember.usecase';
import { RemoveTeamMemberUseCase } from '@/modules/team/usecases/removeTeamMember.usecase';
import { UsersModule } from '@/modules/users/users.module';

@Module({
  imports: [UsersModule],
  controllers: [TeamController],
  providers: [
    TeamRepository,
    TeamMembershipRepository,
    TeamService,
    TeamMembershipService,
    CreateTeamUseCase,
    GetTeamsUseCase,
    GetTeamByIdUseCase,
    UpdateTeamUseCase,
    DeleteTeamUseCase,
    GetTeamMembersUseCase,
    AddTeamMemberUseCase,
    RemoveTeamMemberUseCase,
  ],
})
export class TeamModule {}

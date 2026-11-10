import { Injectable } from '@nestjs/common';
import { Team } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { TeamService } from '@/modules/team/services/team.service';
import { TTeamFilter } from '@/modules/team/dtos/teamFilter';

@Injectable()
export class GetTeamsUseCase implements UseCase<
  TTeamFilter,
  { data: Team[]; total: number }
> {
  constructor(private readonly teamService: TeamService) {}

  async execute(filter: TTeamFilter): Promise<{ data: Team[]; total: number }> {
    return this.teamService.getTeams(filter);
  }
}

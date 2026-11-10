import { Injectable } from '@nestjs/common';
import { Team } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { TeamService } from '@/modules/team/services/team.service';

export type TDeleteTeamRequest = {
  companyId: number;
  teamId: number;
};

@Injectable()
export class DeleteTeamUseCase implements UseCase<TDeleteTeamRequest, Team> {
  constructor(private readonly teamService: TeamService) {}

  async execute(request: TDeleteTeamRequest): Promise<Team> {
    const result = await this.teamService.deleteTeam(
      request.companyId,
      request.teamId,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

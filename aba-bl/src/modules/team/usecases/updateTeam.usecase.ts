import { Injectable } from '@nestjs/common';
import { Team } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { TeamService } from '@/modules/team/services/team.service';
import { UpdateTeamDtoSchema } from '@/modules/team/dtos/UpdateTeamDto';

export type TUpdateTeamRequest = {
  companyId: number;
  teamId: number;
  dto: UpdateTeamDtoSchema;
};

@Injectable()
export class UpdateTeamUseCase implements UseCase<TUpdateTeamRequest, Team> {
  constructor(private readonly teamService: TeamService) {}

  async execute(request: TUpdateTeamRequest): Promise<Team> {
    const result = await this.teamService.updateTeam(
      request.companyId,
      request.teamId,
      request.dto,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

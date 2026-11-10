import { Injectable } from '@nestjs/common';
import { Team } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { TeamService } from '@/modules/team/services/team.service';
import { CreateTeamDtoSchema } from '@/modules/team/dtos/CreateTeamDto';

export type TCreateTeamRequest = {
  companyId: number;
  dto: CreateTeamDtoSchema;
};

@Injectable()
export class CreateTeamUseCase implements UseCase<TCreateTeamRequest, Team> {
  constructor(private readonly teamService: TeamService) {}

  async execute(request: TCreateTeamRequest): Promise<Team> {
    const result = await this.teamService.createTeam(
      request.companyId,
      request.dto,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

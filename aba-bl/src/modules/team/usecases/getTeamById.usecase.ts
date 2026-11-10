import { Injectable } from '@nestjs/common';
import { Team } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { TeamService } from '@/modules/team/services/team.service';

export type TGetTeamByIdRequest = {
  companyId: number;
  teamId: number;
};

@Injectable()
export class GetTeamByIdUseCase implements UseCase<TGetTeamByIdRequest, Team> {
  constructor(private readonly teamService: TeamService) {}

  async execute(request: TGetTeamByIdRequest): Promise<Team> {
    const result = await this.teamService.getTeamById(
      request.companyId,
      request.teamId,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

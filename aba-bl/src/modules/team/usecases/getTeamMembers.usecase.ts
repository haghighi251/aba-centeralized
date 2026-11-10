import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { TeamMembershipService } from '@/modules/team/services/teamMembership.service';
import { TeamMembershipWithUser } from '@/modules/team/repositories/teamMembership.repository';

export type TGetTeamMembersRequest = {
  companyId: number;
  teamId: number;
};

@Injectable()
export class GetTeamMembersUseCase implements UseCase<
  TGetTeamMembersRequest,
  TeamMembershipWithUser[]
> {
  constructor(private readonly teamMembershipService: TeamMembershipService) {}

  async execute(
    request: TGetTeamMembersRequest,
  ): Promise<TeamMembershipWithUser[]> {
    const result = await this.teamMembershipService.listMembers(
      request.companyId,
      request.teamId,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

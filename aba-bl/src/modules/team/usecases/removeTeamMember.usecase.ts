import { Injectable } from '@nestjs/common';
import { TeamMembership } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { TeamMembershipService } from '@/modules/team/services/teamMembership.service';

export type TRemoveTeamMemberRequest = {
  companyId: number;
  teamId: number;
  userId: number;
};

@Injectable()
export class RemoveTeamMemberUseCase implements UseCase<
  TRemoveTeamMemberRequest,
  TeamMembership
> {
  constructor(private readonly teamMembershipService: TeamMembershipService) {}

  async execute(request: TRemoveTeamMemberRequest): Promise<TeamMembership> {
    const result = await this.teamMembershipService.removeMember(
      request.companyId,
      request.teamId,
      request.userId,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

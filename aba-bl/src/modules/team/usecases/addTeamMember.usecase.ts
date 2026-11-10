import { Injectable } from '@nestjs/common';
import { TeamMembership } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { TeamMembershipService } from '@/modules/team/services/teamMembership.service';
import { AddTeamMemberDtoSchema } from '@/modules/team/dtos/AddTeamMemberDto';

export type TAddTeamMemberRequest = {
  companyId: number;
  teamId: number;
  dto: AddTeamMemberDtoSchema;
};

@Injectable()
export class AddTeamMemberUseCase implements UseCase<
  TAddTeamMemberRequest,
  TeamMembership
> {
  constructor(private readonly teamMembershipService: TeamMembershipService) {}

  async execute(request: TAddTeamMemberRequest): Promise<TeamMembership> {
    const result = await this.teamMembershipService.addMember(
      request.companyId,
      request.teamId,
      request.dto.userId,
    );

    if (result.isErr()) {
      throw result.error;
    }

    return result.value;
  }
}

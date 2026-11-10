import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import { TeamMembership } from '@aba/database';
import { TeamRepository } from '@/modules/team/repositories/team.repository';
import { UserRepository } from '@/modules/users/repositories/user.repository';
import {
  TeamMembershipRepository,
  TeamMembershipWithUser,
} from '@/modules/team/repositories/teamMembership.repository';

@Injectable()
export class TeamMembershipService {
  constructor(
    private readonly teamRepository: TeamRepository,
    private readonly userRepository: UserRepository,
    private readonly teamMembershipRepository: TeamMembershipRepository,
  ) {}

  private async resolveTeam(companyId: number, teamId: number) {
    const team = await this.teamRepository.findById(teamId);
    if (!team || team.companyId !== companyId) {
      return null;
    }
    return team;
  }

  async listMembers(
    companyId: number,
    teamId: number,
  ): Promise<Result<TeamMembershipWithUser[], Error>> {
    const team = await this.resolveTeam(companyId, teamId);
    if (!team) {
      return err(new NotFoundException('Team not found.'));
    }

    const members = await this.teamMembershipRepository.findAllForTeam(teamId);
    return ok(members);
  }

  async addMember(
    companyId: number,
    teamId: number,
    userId: number,
  ): Promise<Result<TeamMembership, Error>> {
    const team = await this.resolveTeam(companyId, teamId);
    if (!team) {
      return err(new NotFoundException('Team not found.'));
    }

    const user = await this.userRepository.findById(userId);
    if (!user || user.companyId !== companyId) {
      return err(new NotFoundException('User not found in this company.'));
    }

    const existing = await this.teamMembershipRepository.findByUserAndTeam(
      userId,
      teamId,
    );
    if (existing) {
      return err(
        new ConflictException('This user is already a member of this team.'),
      );
    }

    const created = await this.teamMembershipRepository.create({
      user: { connect: { id: userId } },
      team: { connect: { id: teamId } },
    });

    return ok(created);
  }

  async removeMember(
    companyId: number,
    teamId: number,
    userId: number,
  ): Promise<Result<TeamMembership, Error>> {
    const team = await this.resolveTeam(companyId, teamId);
    if (!team) {
      return err(new NotFoundException('Team not found.'));
    }

    const existing = await this.teamMembershipRepository.findByUserAndTeam(
      userId,
      teamId,
    );
    if (!existing) {
      return err(
        new NotFoundException('This user is not a member of this team.'),
      );
    }

    const removed = await this.teamMembershipRepository.delete(existing.id);
    return ok(removed);
  }
}

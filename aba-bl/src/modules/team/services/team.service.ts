import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import { Team } from '@aba/database';
import { TeamRepository } from '@/modules/team/repositories/team.repository';
import { CreateTeamDtoSchema } from '@/modules/team/dtos/CreateTeamDto';
import { UpdateTeamDtoSchema } from '@/modules/team/dtos/UpdateTeamDto';
import { TTeamFilter } from '@/modules/team/dtos/teamFilter';
import { slugify } from '@/shared/utils/slugify';

@Injectable()
export class TeamService {
  constructor(private readonly teamRepository: TeamRepository) {}

  async createTeam(
    companyId: number,
    dto: CreateTeamDtoSchema,
  ): Promise<Result<Team, Error>> {
    const slug = dto.slug ?? slugify(dto.name);

    const existing = await this.teamRepository.findByCompanyAndSlug(
      companyId,
      slug,
    );
    if (existing) {
      return err(
        new ConflictException(
          `A team with slug "${slug}" already exists for this company.`,
        ),
      );
    }

    const existingName = await this.teamRepository.findByCompanyAndName(
      companyId,
      dto.name,
    );
    if (existingName) {
      return err(
        new ConflictException(
          `A team named "${dto.name}" already exists for this company.`,
        ),
      );
    }

    const created = await this.teamRepository.create({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      company: { connect: { id: companyId } },
    });

    return ok(created);
  }

  async getTeams(
    filter: TTeamFilter,
  ): Promise<{ data: Team[]; total: number }> {
    return this.teamRepository.findAllForCompany(filter);
  }

  async getTeamById(
    companyId: number,
    teamId: number,
  ): Promise<Result<Team, Error>> {
    const team = await this.teamRepository.findById(teamId);

    if (!team || team.companyId !== companyId) {
      return err(new NotFoundException('Team not found.'));
    }

    return ok(team);
  }

  async updateTeam(
    companyId: number,
    teamId: number,
    dto: UpdateTeamDtoSchema,
  ): Promise<Result<Team, Error>> {
    const team = await this.teamRepository.findById(teamId);

    if (!team || team.companyId !== companyId) {
      return err(new NotFoundException('Team not found.'));
    }

    if (dto.slug && dto.slug !== team.slug) {
      const existing = await this.teamRepository.findByCompanyAndSlug(
        companyId,
        dto.slug,
      );
      if (existing) {
        return err(
          new ConflictException(
            `A team with slug "${dto.slug}" already exists for this company.`,
          ),
        );
      }
    }

    if (dto.name && dto.name !== team.name) {
      const existingName = await this.teamRepository.findByCompanyAndName(
        companyId,
        dto.name,
      );
      if (existingName) {
        return err(
          new ConflictException(
            `A team named "${dto.name}" already exists for this company.`,
          ),
        );
      }
    }

    const updated = await this.teamRepository.update(teamId, {
      ...dto,
    });

    return ok(updated);
  }

  async deleteTeam(
    companyId: number,
    teamId: number,
  ): Promise<Result<Team, Error>> {
    const team = await this.teamRepository.findById(teamId);

    if (!team || team.companyId !== companyId) {
      return err(new NotFoundException('Team not found.'));
    }

    const deleted = await this.teamRepository.delete(teamId);

    return ok(deleted);
  }
}

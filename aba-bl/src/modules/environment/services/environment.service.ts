import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import { Environment } from '@aba/database';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { TeamRepository } from '@/modules/team/repositories/team.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { CreateEnvironmentDtoSchema } from '@/modules/environment/dtos/CreateEnvironmentDto';
import { UpdateEnvironmentDtoSchema } from '@/modules/environment/dtos/UpdateEnvironmentDto';
import { TEnvironmentFilter } from '@/modules/environment/dtos/environmentFilter';
import { slugify } from '@/shared/utils/slugify';

@Injectable()
export class EnvironmentService {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly teamRepository: TeamRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  async createEnvironment(
    companyId: number,
    dto: CreateEnvironmentDtoSchema,
  ): Promise<Result<Environment, Error>> {
    const team = await this.teamRepository.findById(dto.teamId);
    if (!team || team.companyId !== companyId) {
      return err(new NotFoundException('Team not found.'));
    }

    if (dto.isProduction) {
      const existingProduction = await this.environmentRepository.findProductionForTeam(
        dto.teamId,
      );
      if (existingProduction) {
        return err(
          new ConflictException(
            `Team already has a production environment ("${existingProduction.name}"). ` +
              `Only one production environment is allowed per team.`,
          ),
        );
      }
    }

    const company = await this.companyRepository.findById(companyId);
    const plan = (company as any)?.subscriptionPlan;
    if (plan && plan.maxEnvironments !== null && !company?.payAsYouGo) {
      const count = await this.environmentRepository.countForCompany(companyId);
      if (count >= plan.maxEnvironments) {
        return err(
          new ForbiddenException(
            `Your plan "${plan.name}" allows a maximum of ${plan.maxEnvironments} environment(s). ` +
              `Upgrade your plan or enable pay-as-you-go to add more.`,
          ),
        );
      }
    }

    const slug = dto.slug ?? slugify(dto.name);

    const existing = await this.environmentRepository.findByTeamAndSlug(
      dto.teamId,
      slug,
    );
    if (existing) {
      return err(
        new ConflictException(
          `An environment with slug "${slug}" already exists for this team.`,
        ),
      );
    }

    const existingName = await this.environmentRepository.findByTeamAndName(
      dto.teamId,
      dto.name,
    );
    if (existingName) {
      return err(
        new ConflictException(
          `An environment named "${dto.name}" already exists for this team.`,
        ),
      );
    }

    const order =
      dto.order ??
      (await this.environmentRepository.findMaxOrder(dto.teamId)) + 1;

    if (dto.order !== undefined) {
      const existingOrder = await this.environmentRepository.findByTeamAndOrder(
        dto.teamId,
        order,
      );
      if (existingOrder) {
        return err(
          new ConflictException(
            `An environment with order ${order} already exists for this team.`,
          ),
        );
      }
    }

    const created = await this.environmentRepository.create({
      name: dto.name,
      slug,
      type: dto.type,
      isProduction: dto.isProduction,
      order,
      description: dto.description ?? null,
      company: { connect: { id: companyId } },
      team: { connect: { id: dto.teamId } },
    });

    return ok(created);
  }

  async getEnvironments(
    filter: TEnvironmentFilter,
  ): Promise<{ data: Environment[]; total: number }> {
    return this.environmentRepository.findAllForCompany(filter);
  }

  async getEnvironmentById(
    companyId: number,
    environmentId: number,
  ): Promise<Result<Environment, Error>> {
    const environment =
      await this.environmentRepository.findById(environmentId);

    if (!environment || environment.companyId !== companyId) {
      return err(new NotFoundException('Environment not found.'));
    }

    return ok(environment);
  }

  async updateEnvironment(
    companyId: number,
    environmentId: number,
    dto: UpdateEnvironmentDtoSchema,
  ): Promise<Result<Environment, Error>> {
    const environment =
      await this.environmentRepository.findById(environmentId);

    if (!environment || environment.companyId !== companyId) {
      return err(new NotFoundException('Environment not found.'));
    }

    let teamId = environment.teamId;

    if (dto.teamId !== undefined && dto.teamId !== environment.teamId) {
      const team = await this.teamRepository.findById(dto.teamId);
      if (!team || team.companyId !== companyId) {
        return err(new NotFoundException('Team not found.'));
      }
      teamId = dto.teamId;
    }

    const teamChanged = teamId !== environment.teamId;

    const willBeProduction = dto.isProduction ?? environment.isProduction;
    if (willBeProduction) {
      const existingProduction = await this.environmentRepository.findProductionForTeam(
        teamId,
        environmentId,
      );
      if (existingProduction) {
        return err(
          new ConflictException(
            `Team already has a production environment ("${existingProduction.name}"). ` +
              `Only one production environment is allowed per team.`,
          ),
        );
      }
    }

    if ((dto.slug && dto.slug !== environment.slug) || teamChanged) {
      const slugToCheck = dto.slug ?? environment.slug;
      const existing = await this.environmentRepository.findByTeamAndSlug(
        teamId,
        slugToCheck,
      );
      if (existing) {
        return err(
          new ConflictException(
            `An environment with slug "${slugToCheck}" already exists for this team.`,
          ),
        );
      }
    }

    if (dto.name && dto.name !== environment.name) {
      const existingName = await this.environmentRepository.findByTeamAndName(
        teamId,
        dto.name,
      );
      if (existingName) {
        return err(
          new ConflictException(
            `An environment named "${dto.name}" already exists for this team.`,
          ),
        );
      }
    }

    if (dto.order !== undefined && dto.order !== environment.order) {
      const existingOrder = await this.environmentRepository.findByTeamAndOrder(
        teamId,
        dto.order,
      );
      if (existingOrder) {
        return err(
          new ConflictException(
            `An environment with order ${dto.order} already exists for this team.`,
          ),
        );
      }
    }

    const { teamId: dtoTeamId, ...rest } = dto;

    const updated = await this.environmentRepository.update(environmentId, {
      ...rest,
      ...(dtoTeamId !== undefined && {
        team: { connect: { id: dtoTeamId } },
      }),
    });

    return ok(updated);
  }

  async deleteEnvironment(
    companyId: number,
    environmentId: number,
  ): Promise<Result<Environment, Error>> {
    const environment =
      await this.environmentRepository.findById(environmentId);

    if (!environment || environment.companyId !== companyId) {
      return err(new NotFoundException('Environment not found.'));
    }

    const deleted = await this.environmentRepository.delete(environmentId);

    return ok(deleted);
  }
}

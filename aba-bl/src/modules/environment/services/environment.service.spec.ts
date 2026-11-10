import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  Environment,
  EnvironmentStatus,
  EnvironmentType,
  Team,
  TeamStatus,
} from '@aba/database';
import { EnvironmentService } from './environment.service';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { TeamRepository } from '@/modules/team/repositories/team.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { CreateEnvironmentDtoSchema } from '@/modules/environment/dtos/CreateEnvironmentDto';

describe('EnvironmentService', () => {
  let service: EnvironmentService;
  let repository: jest.Mocked<EnvironmentRepository>;
  let teamRepository: jest.Mocked<TeamRepository>;
  let companyRepository: jest.Mocked<CompanyRepository>;

  const mockEnvironment: Environment = {
    id: 1,
    name: 'Production',
    slug: 'production',
    type: EnvironmentType.PRODUCTION,
    isProduction: true,
    order: 4,
    description: null,
    status: EnvironmentStatus.ACTIVE,
    companyId: 1,
    teamId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as Environment;

  const mockTeam: Team = {
    id: 1,
    name: 'Platform',
    slug: 'platform',
    description: null,
    status: TeamStatus.ACTIVE,
    companyId: 1,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  } as Team;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnvironmentService,
        {
          provide: EnvironmentRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findByTeamAndSlug: jest.fn(),
            findByTeamAndName: jest.fn(),
            findByTeamAndOrder: jest.fn(),
            findMaxOrder: jest.fn(),
            findAllForCompany: jest.fn(),
            findProductionForTeam: jest.fn(),
          },
        },
        {
          provide: TeamRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: CompanyRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(EnvironmentService);
    repository = module.get(EnvironmentRepository);
    teamRepository = module.get(TeamRepository);
    companyRepository = module.get(CompanyRepository);
  });

  describe('createEnvironment', () => {
    const dto: CreateEnvironmentDtoSchema = {
      teamId: 1,
      name: 'Production',
      type: EnvironmentType.PRODUCTION,
      isProduction: true,
    };

    it('derives the slug from the name when not provided', async () => {
      teamRepository.findById.mockResolvedValue(mockTeam);
      repository.findByTeamAndSlug.mockResolvedValue(null);
      repository.findByTeamAndName.mockResolvedValue(null);
      repository.findMaxOrder.mockResolvedValue(3);
      repository.create.mockResolvedValue(mockEnvironment);

      const result = await service.createEnvironment(1, dto);

      expect(result.isOk()).toBe(true);
      expect(repository.findByTeamAndSlug).toHaveBeenCalledWith(
        1,
        'production',
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'production', order: 4 }),
      );
    });

    it('uses the provided slug and order when given', async () => {
      teamRepository.findById.mockResolvedValue(mockTeam);
      repository.findByTeamAndSlug.mockResolvedValue(null);
      repository.findByTeamAndName.mockResolvedValue(null);
      repository.findByTeamAndOrder.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockEnvironment);

      await service.createEnvironment(1, {
        ...dto,
        slug: 'prod-eu',
        order: 1,
      });

      expect(repository.findByTeamAndSlug).toHaveBeenCalledWith(1, 'prod-eu');
      expect(repository.findMaxOrder).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'prod-eu', order: 1 }),
      );
    });

    it('returns a NotFoundException when the team does not exist', async () => {
      teamRepository.findById.mockResolvedValue(null);

      const result = await service.createEnvironment(1, dto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('returns a NotFoundException when the team belongs to another company', async () => {
      teamRepository.findById.mockResolvedValue({ ...mockTeam, companyId: 2 });

      const result = await service.createEnvironment(1, dto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('returns a ConflictException when the slug already exists for the team', async () => {
      teamRepository.findById.mockResolvedValue(mockTeam);
      repository.findByTeamAndSlug.mockResolvedValue(mockEnvironment);

      const result = await service.createEnvironment(1, dto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictException);
      }
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('connects the environment to the given company and team', async () => {
      teamRepository.findById.mockResolvedValue({ ...mockTeam, companyId: 7 });
      repository.findByTeamAndSlug.mockResolvedValue(null);
      repository.findByTeamAndName.mockResolvedValue(null);
      repository.findMaxOrder.mockResolvedValue(0);
      repository.create.mockResolvedValue(mockEnvironment);
      companyRepository.findById.mockResolvedValue(undefined as any);

      await service.createEnvironment(7, dto);

      expect(companyRepository.findById).toHaveBeenCalledWith(7);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company: { connect: { id: 7 } },
          team: { connect: { id: 1 } },
        }),
      );
    });

    it('returns a ConflictException when the team already has a production environment', async () => {
      teamRepository.findById.mockResolvedValue(mockTeam);
      repository.findProductionForTeam.mockResolvedValue({
        ...mockEnvironment,
        id: 99,
        name: 'Existing Prod',
      });

      const result = await service.createEnvironment(1, dto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictException);
        expect(result.error.message).toContain('Existing Prod');
      }
      expect(repository.findProductionForTeam).toHaveBeenCalledWith(1);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('does not check for an existing production environment when isProduction is false', async () => {
      teamRepository.findById.mockResolvedValue(mockTeam);
      repository.findByTeamAndSlug.mockResolvedValue(null);
      repository.findByTeamAndName.mockResolvedValue(null);
      repository.findMaxOrder.mockResolvedValue(0);
      repository.create.mockResolvedValue({
        ...mockEnvironment,
        isProduction: false,
      });

      const result = await service.createEnvironment(1, {
        ...dto,
        isProduction: false,
      });

      expect(result.isOk()).toBe(true);
      expect(repository.findProductionForTeam).not.toHaveBeenCalled();
    });

    it('allows creating a production environment when the team has none yet', async () => {
      teamRepository.findById.mockResolvedValue(mockTeam);
      repository.findProductionForTeam.mockResolvedValue(null);
      repository.findByTeamAndSlug.mockResolvedValue(null);
      repository.findByTeamAndName.mockResolvedValue(null);
      repository.findMaxOrder.mockResolvedValue(0);
      repository.create.mockResolvedValue(mockEnvironment);

      const result = await service.createEnvironment(1, dto);

      expect(result.isOk()).toBe(true);
      expect(repository.create).toHaveBeenCalled();
    });
  });

  describe('getEnvironments', () => {
    it('delegates to the repository', async () => {
      repository.findAllForCompany.mockResolvedValue({
        data: [mockEnvironment],
        total: 1,
      });

      const result = await service.getEnvironments({
        companyId: 1,
        sortBy: 'order',
        sortOrder: 'asc',
      });

      expect(result).toEqual({ data: [mockEnvironment], total: 1 });
    });
  });

  describe('getEnvironmentById', () => {
    it('returns the environment when it belongs to the company', async () => {
      repository.findById.mockResolvedValue(mockEnvironment);

      const result = await service.getEnvironmentById(1, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(mockEnvironment);
      }
    });

    it('returns NotFoundException when the environment does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getEnvironmentById(1, 999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
    });

    it('returns NotFoundException when the environment belongs to another company', async () => {
      repository.findById.mockResolvedValue({
        ...mockEnvironment,
        companyId: 2,
      });

      const result = await service.getEnvironmentById(1, 1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('updateEnvironment', () => {
    it('updates the environment when it belongs to the company', async () => {
      repository.findById.mockResolvedValue(mockEnvironment);
      repository.update.mockResolvedValue({
        ...mockEnvironment,
        name: 'Prod EU',
      });

      const result = await service.updateEnvironment(1, 1, { name: 'Prod EU' });

      expect(result.isOk()).toBe(true);
      expect(repository.update).toHaveBeenCalledWith(1, { name: 'Prod EU' });
    });

    it('returns NotFoundException when the environment does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.updateEnvironment(1, 999, { name: 'X' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the environment belongs to another company', async () => {
      repository.findById.mockResolvedValue({
        ...mockEnvironment,
        companyId: 2,
      });

      const result = await service.updateEnvironment(1, 1, { name: 'X' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('returns ConflictException when changing to a slug already in use within the team', async () => {
      repository.findById.mockResolvedValue(mockEnvironment);
      repository.findByTeamAndSlug.mockResolvedValue({
        ...mockEnvironment,
        id: 2,
        slug: 'staging',
      });

      const result = await service.updateEnvironment(1, 1, { slug: 'staging' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictException);
      }
      expect(repository.update).not.toHaveBeenCalled();
      expect(repository.findByTeamAndSlug).toHaveBeenCalledWith(1, 'staging');
    });

    it('allows updating to the same slug the environment already has', async () => {
      repository.findById.mockResolvedValue(mockEnvironment);
      repository.update.mockResolvedValue(mockEnvironment);

      const result = await service.updateEnvironment(1, 1, {
        slug: mockEnvironment.slug,
      });

      expect(result.isOk()).toBe(true);
      expect(repository.findByTeamAndSlug).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when moving to a team that does not exist', async () => {
      repository.findById.mockResolvedValue(mockEnvironment);
      teamRepository.findById.mockResolvedValue(null);

      const result = await service.updateEnvironment(1, 1, { teamId: 2 });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when moving to a team in another company', async () => {
      repository.findById.mockResolvedValue(mockEnvironment);
      teamRepository.findById.mockResolvedValue({
        ...mockTeam,
        id: 2,
        companyId: 2,
      });

      const result = await service.updateEnvironment(1, 1, { teamId: 2 });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('moves the environment to a new team in the same company', async () => {
      repository.findById.mockResolvedValue(mockEnvironment);
      teamRepository.findById.mockResolvedValue({
        ...mockTeam,
        id: 2,
        companyId: 1,
      });
      repository.findByTeamAndSlug.mockResolvedValue(null);
      repository.update.mockResolvedValue({ ...mockEnvironment, teamId: 2 });

      const result = await service.updateEnvironment(1, 1, { teamId: 2 });

      expect(result.isOk()).toBe(true);
      expect(repository.findByTeamAndSlug).toHaveBeenCalledWith(
        2,
        mockEnvironment.slug,
      );
      expect(repository.update).toHaveBeenCalledWith(1, {
        team: { connect: { id: 2 } },
      });
    });

    it('returns ConflictException when promoting an environment to production while the team already has one', async () => {
      repository.findById.mockResolvedValue({
        ...mockEnvironment,
        isProduction: false,
      });
      repository.findProductionForTeam.mockResolvedValue({
        ...mockEnvironment,
        id: 99,
        name: 'Existing Prod',
      });

      const result = await service.updateEnvironment(1, 1, {
        isProduction: true,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictException);
      }
      expect(repository.findProductionForTeam).toHaveBeenCalledWith(1, 1);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('excludes itself when re-saving an environment that is already production', async () => {
      repository.findById.mockResolvedValue(mockEnvironment); // isProduction: true
      repository.findProductionForTeam.mockResolvedValue(null);
      repository.update.mockResolvedValue(mockEnvironment);

      const result = await service.updateEnvironment(1, 1, {
        name: 'Renamed Prod',
      });

      expect(result.isOk()).toBe(true);
      expect(repository.findProductionForTeam).toHaveBeenCalledWith(1, 1);
    });

    it('does not check production uniqueness when the environment is not and will not be production', async () => {
      repository.findById.mockResolvedValue({
        ...mockEnvironment,
        isProduction: false,
      });
      repository.update.mockResolvedValue({
        ...mockEnvironment,
        isProduction: false,
        name: 'Staging',
      });

      const result = await service.updateEnvironment(1, 1, {
        name: 'Staging',
      });

      expect(result.isOk()).toBe(true);
      expect(repository.findProductionForTeam).not.toHaveBeenCalled();
    });

    it('returns ConflictException when moving an existing production environment to a team that already has one', async () => {
      repository.findById.mockResolvedValue(mockEnvironment); // isProduction: true
      teamRepository.findById.mockResolvedValue({
        ...mockTeam,
        id: 2,
        companyId: 1,
      });
      repository.findProductionForTeam.mockResolvedValue({
        ...mockEnvironment,
        id: 99,
        teamId: 2,
        name: 'Existing Prod In New Team',
      });

      const result = await service.updateEnvironment(1, 1, { teamId: 2 });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictException);
      }
      expect(repository.findProductionForTeam).toHaveBeenCalledWith(2, 1);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteEnvironment', () => {
    it('deletes the environment when it belongs to the company', async () => {
      repository.findById.mockResolvedValue(mockEnvironment);
      repository.delete.mockResolvedValue(mockEnvironment);

      const result = await service.deleteEnvironment(1, 1);

      expect(result.isOk()).toBe(true);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('returns NotFoundException when the environment does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.deleteEnvironment(1, 999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the environment belongs to another company', async () => {
      repository.findById.mockResolvedValue({
        ...mockEnvironment,
        companyId: 2,
      });

      const result = await service.deleteEnvironment(1, 1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});

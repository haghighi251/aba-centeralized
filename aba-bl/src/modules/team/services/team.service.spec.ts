import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Team, TeamStatus } from '@aba/database';
import { TeamService } from './team.service';
import { TeamRepository } from '@/modules/team/repositories/team.repository';
import { CreateTeamDtoSchema } from '@/modules/team/dtos/CreateTeamDto';

describe('TeamService', () => {
  let service: TeamService;
  let repository: jest.Mocked<TeamRepository>;

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
        TeamService,
        {
          provide: TeamRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findByCompanyAndSlug: jest.fn(),
            findByCompanyAndName: jest.fn(),
            findAllForCompany: jest.fn(),
            countForCompany: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(TeamService);
    repository = module.get(TeamRepository);
  });

  describe('createTeam', () => {
    const dto: CreateTeamDtoSchema = {
      name: 'Platform',
    };

    it('derives the slug from the name when not provided', async () => {
      repository.findByCompanyAndSlug.mockResolvedValue(null);
      repository.findByCompanyAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockTeam);

      const result = await service.createTeam(1, dto);

      expect(result.isOk()).toBe(true);
      expect(repository.findByCompanyAndSlug).toHaveBeenCalledWith(
        1,
        'platform',
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'platform' }),
      );
    });

    it('uses the provided slug when given', async () => {
      repository.findByCompanyAndSlug.mockResolvedValue(null);
      repository.findByCompanyAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockTeam);

      await service.createTeam(1, { ...dto, slug: 'core-platform' });

      expect(repository.findByCompanyAndSlug).toHaveBeenCalledWith(
        1,
        'core-platform',
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'core-platform' }),
      );
    });

    it('returns a ConflictException when the slug already exists', async () => {
      repository.findByCompanyAndSlug.mockResolvedValue(mockTeam);

      const result = await service.createTeam(1, dto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictException);
      }
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('returns a ConflictException when the name already exists', async () => {
      repository.findByCompanyAndSlug.mockResolvedValue(null);
      repository.findByCompanyAndName.mockResolvedValue(mockTeam);

      const result = await service.createTeam(1, dto);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictException);
      }
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('connects the team to the given company', async () => {
      repository.findByCompanyAndSlug.mockResolvedValue(null);
      repository.findByCompanyAndName.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockTeam);

      await service.createTeam(7, dto);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ company: { connect: { id: 7 } } }),
      );
    });
  });

  describe('getTeams', () => {
    it('delegates to the repository', async () => {
      repository.findAllForCompany.mockResolvedValue({
        data: [mockTeam],
        total: 1,
      });

      const result = await service.getTeams({
        companyId: 1,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result).toEqual({ data: [mockTeam], total: 1 });
    });
  });

  describe('getTeamById', () => {
    it('returns the team when it belongs to the company', async () => {
      repository.findById.mockResolvedValue(mockTeam);

      const result = await service.getTeamById(1, 1);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(mockTeam);
      }
    });

    it('returns NotFoundException when the team does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getTeamById(1, 999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
    });

    it('returns NotFoundException when the team belongs to another company', async () => {
      repository.findById.mockResolvedValue({ ...mockTeam, companyId: 2 });

      const result = await service.getTeamById(1, 1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('updateTeam', () => {
    it('updates the team when it belongs to the company', async () => {
      repository.findById.mockResolvedValue(mockTeam);
      repository.update.mockResolvedValue({ ...mockTeam, name: 'Platform EU' });

      const result = await service.updateTeam(1, 1, { name: 'Platform EU' });

      expect(result.isOk()).toBe(true);
      expect(repository.update).toHaveBeenCalledWith(1, {
        name: 'Platform EU',
      });
    });

    it('returns NotFoundException when the team does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.updateTeam(1, 999, { name: 'X' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the team belongs to another company', async () => {
      repository.findById.mockResolvedValue({ ...mockTeam, companyId: 2 });

      const result = await service.updateTeam(1, 1, { name: 'X' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('returns ConflictException when changing to a slug already in use', async () => {
      repository.findById.mockResolvedValue(mockTeam);
      repository.findByCompanyAndSlug.mockResolvedValue({
        ...mockTeam,
        id: 2,
        slug: 'growth',
      });

      const result = await service.updateTeam(1, 1, { slug: 'growth' });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictException);
      }
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('allows updating to the same slug the team already has', async () => {
      repository.findById.mockResolvedValue(mockTeam);
      repository.update.mockResolvedValue(mockTeam);

      const result = await service.updateTeam(1, 1, {
        slug: mockTeam.slug,
      });

      expect(result.isOk()).toBe(true);
      expect(repository.findByCompanyAndSlug).not.toHaveBeenCalled();
    });
  });

  describe('deleteTeam', () => {
    it('deletes the team when it belongs to the company', async () => {
      repository.findById.mockResolvedValue(mockTeam);
      repository.delete.mockResolvedValue(mockTeam);

      const result = await service.deleteTeam(1, 1);

      expect(result.isOk()).toBe(true);
      expect(repository.delete).toHaveBeenCalledWith(1);
    });

    it('returns NotFoundException when the team does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.deleteTeam(1, 999);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.delete).not.toHaveBeenCalled();
    });

    it('returns NotFoundException when the team belongs to another company', async () => {
      repository.findById.mockResolvedValue({ ...mockTeam, companyId: 2 });

      const result = await service.deleteTeam(1, 1);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
      expect(repository.delete).not.toHaveBeenCalled();
    });
  });
});

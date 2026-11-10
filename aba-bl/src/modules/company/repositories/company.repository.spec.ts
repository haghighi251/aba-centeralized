import { CompanyRepository } from './company.repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { Prisma, Company, CompanyStatus } from '@aba/database';
import {
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TRegisterCompany } from '@/modules/company/dtos/addNewCompanyDto';
import { TCompanyFilter } from '@/modules/company/dtos/companyFilter';

function prismaKnownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('Prisma error', {
    code,
    clientVersion: '5.0.0',
  } as any);
}

describe('CompanyRepository', () => {
  let repository: CompanyRepository;
  let prisma: {
    company: Record<string, jest.Mock>;
    user: Record<string, jest.Mock>;
    servicePackage: Record<string, jest.Mock>;
    notificationLog: Record<string, jest.Mock>;
    $transaction: jest.Mock;
  };

  const mockCompany: Company = {
    id: 1,
    username: 'acme',
    email: 'acme@example.com',
    address: '123 Main St',
    city: 'Metropolis',
    state: 'NY',
    country: 'USA',
    postalCode: '10001',
    website: 'https://acme.com',
    status: CompanyStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Company;

  const registerData: TRegisterCompany = {
    username: 'acme',
    email: 'acme@example.com',
    website: 'https://acme.com',
    password: 'StrongPass123',
    phone: '+1234567890',
    address: '123 Main St',
    city: 'Metropolis',
    state: 'NY',
    country: 'USA',
    postalCode: '10001',
    firstName: 'John',
    lastName: 'Doe',
    isAdmin: true,
  };

  beforeEach(() => {
    prisma = {
      company: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        create: jest.fn(),
      },
      servicePackage: {
        findMany: jest.fn(),
      },
      notificationLog: {
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    repository = new CompanyRepository(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a company stripping registration-only fields', async () => {
      prisma.company.create.mockResolvedValue(mockCompany);

      const result = await repository.create(registerData);

      expect(result).toBe(mockCompany);
      expect(prisma.company.create).toHaveBeenCalledWith({
        data: {
          username: registerData.username,
          email: registerData.email,
          website: registerData.website,
          address: registerData.address,
          city: registerData.city,
          state: registerData.state,
          country: registerData.country,
          postalCode: registerData.postalCode,
        },
        include: { users: true },
      });
    });

    it('defaults nullable address fields to null when not provided', async () => {
      prisma.company.create.mockResolvedValue(mockCompany);

      const { address, city, state, country, postalCode, ...rest } =
        registerData;

      await repository.create(rest as TRegisterCompany);

      expect(prisma.company.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          address: null,
          city: null,
          state: null,
          country: null,
          postalCode: null,
        }),
        include: { users: true },
      });
    });

    it('maps a unique-constraint violation to ConflictException', async () => {
      prisma.company.create.mockRejectedValue(prismaKnownError('P2002'));

      await expect(repository.create(registerData)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rethrows unknown errors as-is', async () => {
      const unknown = new Error('boom');
      prisma.company.create.mockRejectedValue(unknown);

      await expect(repository.create(registerData)).rejects.toThrow('boom');
    });
  });

  describe('findById', () => {
    it('finds a company by numeric id with users and counts included', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);

      const result = await repository.findById(1);

      expect(result).toBe(mockCompany);
      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          users: true,
          subscriptionPlan: true,
          _count: { select: { users: true } },
        },
      });
    });

    it('normalizes a numeric string id before querying', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);

      await repository.findById('1');

      expect(prisma.company.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
    });

    it('returns null when no company is found', async () => {
      prisma.company.findUnique.mockResolvedValue(null);

      const result = await repository.findById(99);

      expect(result).toBeNull();
    });

    it('throws when given a non-numeric string id', async () => {
      await expect(repository.findById('abc')).rejects.toThrow(
        'Invalid company ID: abc',
      );
    });
  });

  describe('findAll', () => {
    it('applies default pagination and sorting', async () => {
      prisma.company.findMany.mockResolvedValue([mockCompany]);
      prisma.company.count.mockResolvedValue(1);

      const result = await repository.findAll({});

      expect(result).toEqual({ data: [mockCompany], total: 1 });
      expect(prisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('applies custom pagination, sorting and a search filter', async () => {
      prisma.company.findMany.mockResolvedValue([mockCompany]);
      prisma.company.count.mockResolvedValue(1);

      const filter: TCompanyFilter = {
        page: 2,
        limit: 5,
        sortBy: 'username',
        sortOrder: 'asc',
        search: 'acme',
        status: CompanyStatus.ACTIVE,
      };

      await repository.findAll(filter);

      expect(prisma.company.findMany).toHaveBeenCalledWith({
        where: {
          status: CompanyStatus.ACTIVE,
          OR: [
            { username: { contains: 'acme', mode: 'insensitive' } },
            { email: { contains: 'acme', mode: 'insensitive' } },
          ],
        },
        skip: 5,
        take: 5,
        orderBy: { username: 'asc' },
        include: { _count: { select: { users: true } } },
      });
      expect(prisma.company.count).toHaveBeenCalledWith({
        where: {
          status: CompanyStatus.ACTIVE,
          OR: [
            { username: { contains: 'acme', mode: 'insensitive' } },
            { email: { contains: 'acme', mode: 'insensitive' } },
          ],
        },
      });
    });
  });

  describe('update', () => {
    it('updates a company by id', async () => {
      const updated = { ...mockCompany, city: 'Gotham' };
      prisma.company.update.mockResolvedValue(updated);

      const result = await repository.update(1, { city: 'Gotham' } as any);

      expect(result).toBe(updated);
      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { city: 'Gotham' },
        include: { users: true, subscriptionPlan: true },
      });
    });

    it('maps a not-found error to NotFoundException', async () => {
      prisma.company.update.mockRejectedValue(prismaKnownError('P2025'));

      await expect(repository.update(99, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('maps unrecognized prisma errors to InternalServerErrorException', async () => {
      prisma.company.update.mockRejectedValue(prismaKnownError('P9999'));

      await expect(repository.update(1, {} as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findByEmail', () => {
    it('finds a company by email', async () => {
      prisma.company.findUnique.mockResolvedValue(mockCompany);

      const result = await repository.findByEmail('acme@example.com');

      expect(result).toBe(mockCompany);
      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { email: 'acme@example.com' },
      });
    });
  });

  describe('delete', () => {
    it('deletes a company by id', async () => {
      prisma.company.delete.mockResolvedValue(mockCompany);

      const result = await repository.delete(1);

      expect(result).toBe(mockCompany);
      expect(prisma.company.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('maps a not-found error to NotFoundException', async () => {
      prisma.company.delete.mockRejectedValue(prismaKnownError('P2025'));

      await expect(repository.delete(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('exists', () => {
    it('returns true when a company with the id exists', async () => {
      prisma.company.count.mockResolvedValue(1);

      const result = await repository.exists(1);

      expect(result).toBe(true);
      expect(prisma.company.count).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('returns false when no company with the id exists', async () => {
      prisma.company.count.mockResolvedValue(0);

      const result = await repository.exists(99);

      expect(result).toBe(false);
    });
  });

  describe('findAllWithBusinessOwner', () => {
    it('filters companies that have a BUSINESS_OWNER user', async () => {
      prisma.company.findMany.mockResolvedValue([mockCompany]);
      prisma.company.count.mockResolvedValue(1);

      const result = await repository.findAllWithBusinessOwner({});

      expect(result).toEqual({ data: [mockCompany], total: 1 });
      expect(prisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            users: { some: { role: 'BUSINESS_OWNER' } },
          }),
          skip: 0,
          take: 20,
        }),
      );
    });

    it('applies a search filter alongside the owner filter', async () => {
      prisma.company.findMany.mockResolvedValue([]);
      prisma.company.count.mockResolvedValue(0);

      await repository.findAllWithBusinessOwner({ search: 'acme' });

      expect(prisma.company.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { username: { contains: 'acme', mode: 'insensitive' } },
              { email: { contains: 'acme', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('updates the company status', async () => {
      const updated = { ...mockCompany, status: CompanyStatus.SUSPENDED };
      prisma.company.update.mockResolvedValue(updated);

      const result = await repository.updateStatus(1, 'SUSPENDED');

      expect(result).toBe(updated);
      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'SUSPENDED' },
      });
    });
  });

  describe('getStatusSummary', () => {
    it('aggregates counts per status for companies with a business owner', async () => {
      prisma.company.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5) // active
        .mockResolvedValueOnce(2) // inactive
        .mockResolvedValueOnce(1) // suspended
        .mockResolvedValueOnce(2); // pending

      const result = await repository.getStatusSummary();

      expect(result).toEqual({
        total: 10,
        active: 5,
        inactive: 2,
        suspended: 1,
        pending: 2,
      });
      expect(prisma.company.count).toHaveBeenCalledTimes(5);
      expect(prisma.company.count).toHaveBeenNthCalledWith(1, {
        where: { users: { some: { role: 'BUSINESS_OWNER' } } },
      });
      expect(prisma.company.count).toHaveBeenNthCalledWith(2, {
        where: {
          users: { some: { role: 'BUSINESS_OWNER' } },
          status: 'ACTIVE',
        },
      });
    });
  });

  describe('findByEmailOrName', () => {
    it('finds a company matching either the email or the username', async () => {
      prisma.company.findFirst.mockResolvedValue(mockCompany);

      const result = await repository.findByEmailOrName(
        'acme@example.com',
        'acme',
      );

      expect(result).toBe(mockCompany);
      expect(prisma.company.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ email: 'acme@example.com' }, { username: 'acme' }] },
      });
    });

    it('returns null when nothing matches', async () => {
      prisma.company.findFirst.mockResolvedValue(null);

      const result = await repository.findByEmailOrName('x@y.com', 'xyz');

      expect(result).toBeNull();
    });
  });

  describe('createWithAdminUser', () => {
    it('creates the company and its admin user within a transaction', async () => {
      prisma.$transaction.mockImplementation(async (cb) =>
        cb({
          company: { create: jest.fn().mockResolvedValue(mockCompany) },
          user: { create: jest.fn().mockResolvedValue({ id: 1 }) },
        }),
      );

      const result = await repository.createWithAdminUser({
        ...registerData,
        password: 'hashed-password',
      });

      expect(result).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('creates the company without optional contact fields', async () => {
      const companyCreate = jest.fn().mockResolvedValue(mockCompany);
      const userCreate = jest.fn().mockResolvedValue({ id: 1 });
      prisma.$transaction.mockImplementation(async (cb) =>
        cb({
          company: { create: companyCreate },
          user: { create: userCreate },
        }),
      );

      const {
        phone,
        address,
        city,
        state,
        country,
        postalCode,
        firstName,
        lastName,
        ...rest
      } = registerData;

      await repository.createWithAdminUser({
        ...(rest as TRegisterCompany),
        password: 'hashed-password',
      });

      expect(companyCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          address: null,
          city: null,
          state: null,
          country: null,
          postalCode: null,
          status: 'PENDING',
        }),
      });
      expect(userCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phone: null,
          firstName: null,
          lastName: null,
          role: 'BUSINESS_OWNER',
          password: 'hashed-password',
          companyId: mockCompany.id,
        }),
      });
    });

    it('maps a unique-constraint violation to ConflictException', async () => {
      prisma.$transaction.mockRejectedValue(prismaKnownError('P2002'));

      await expect(
        repository.createWithAdminUser({
          ...registerData,
          password: 'hashed-password',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows unknown errors as-is', async () => {
      const unknown = new Error('transaction failed');
      prisma.$transaction.mockRejectedValue(unknown);

      await expect(
        repository.createWithAdminUser({
          ...registerData,
          password: 'hashed-password',
        }),
      ).rejects.toThrow('transaction failed');
    });
  });

  describe('findCompaniesWithVulnerabilitySummary', () => {
    it('attaches vulnerability/notification counts to each company', async () => {
      const companyWithOwner = { ...mockCompany, primaryOwnerId: 7 };
      prisma.company.findMany.mockResolvedValue([companyWithOwner]);
      prisma.company.count.mockResolvedValue(1);
      prisma.servicePackage.findMany.mockResolvedValue([
        { serviceId: 10 },
        { serviceId: 10 },
        { serviceId: 20 },
      ]);
      prisma.notificationLog.count.mockResolvedValue(5);

      const result = await repository.findCompaniesWithVulnerabilitySummary({});

      expect(result.total).toBe(1);
      expect(result.data).toEqual([
        {
          ...companyWithOwner,
          vulnerablePackageCount: 3,
          affectedServiceCount: 2,
          notificationCount: 5,
          hasPrimaryOwner: true,
        },
      ]);
      expect(prisma.servicePackage.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          service: { companyId: companyWithOwner.id },
          package: { vulnerabilities: { some: {} } },
        },
        select: { serviceId: true },
      });
      expect(prisma.notificationLog.count).toHaveBeenCalledWith({
        where: { companyId: companyWithOwner.id },
      });
    });

    it('reports hasPrimaryOwner=false when none is set', async () => {
      const companyWithoutOwner = { ...mockCompany, primaryOwnerId: null };
      prisma.company.findMany.mockResolvedValue([companyWithoutOwner]);
      prisma.company.count.mockResolvedValue(1);
      prisma.servicePackage.findMany.mockResolvedValue([]);
      prisma.notificationLog.count.mockResolvedValue(0);

      const result = await repository.findCompaniesWithVulnerabilitySummary({});

      expect(result.data[0].hasPrimaryOwner).toBe(false);
      expect(result.data[0].vulnerablePackageCount).toBe(0);
      expect(result.data[0].affectedServiceCount).toBe(0);
    });
  });
});

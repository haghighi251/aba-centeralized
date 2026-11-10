import { BaseRepository } from '@/shared/repositories/base-repository';
import { Injectable } from '@nestjs/common';
import { Company, ServicePackageStatus } from '@aba/database';
import { TRegisterCompany } from '@/modules/company/dtos/addNewCompanyDto';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { TUpdateCompany } from '@/modules/company/dtos/updateCompany';
import { TCompanyFilter } from '@/modules/company/dtos/companyFilter';

export type CompanyVulnerabilitySummary = Company & {
  vulnerablePackageCount: number;
  affectedServiceCount: number;
  notificationCount: number;
  hasPrimaryOwner: boolean;
};

@Injectable()
export class CompanyRepository extends BaseRepository<
  Company,
  TRegisterCompany,
  TUpdateCompany,
  TCompanyFilter
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(createCompanyDto: TRegisterCompany): Promise<Company> {
    try {
      return await this.prisma.company.create({
        data: this.companyMapper(createCompanyDto),
        include: { users: true },
      });
    } catch (error) {
      this.handleError(error, 'Company');
    }
  }

  async findById(id: number | string): Promise<Company | null> {
    return this.prisma.company.findUnique({
      where: { id: this.normalizeId(id) },
      include: {
        users: true,
        subscriptionPlan: true,
        _count: {
          select: { users: true },
        },
      },
    });
  }

  async findAll(
    filter: TCompanyFilter,
  ): Promise<{ data: Company[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...where
    } = filter;

    // Use Prisma.CompanyWhereInput or any if it doesn't exist
    const whereClause: unknown = {
      ...where,
      ...(search && {
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: {
              users: true,
              // Remove 'projects' if the relation doesn't exist
              // projects: true,
            },
          },
        },
      }),
      this.prisma.company.count({ where: whereClause }),
    ]);

    return { data, total };
  }

  async update(
    id: string | number,
    updateCompanyDto: TUpdateCompany,
  ): Promise<Company> {
    try {
      const { subscriptionPlanId, ...rest } = updateCompanyDto;
      return await this.prisma.company.update({
        where: { id: this.normalizeId(id) },
        data: {
          ...rest,
          ...(subscriptionPlanId !== undefined && {
            subscriptionPlan: subscriptionPlanId
              ? { connect: { id: subscriptionPlanId } }
              : { disconnect: true },
          }),
        },
        include: { users: true, subscriptionPlan: true },
      });
    } catch (error) {
      this.handleError(error, 'Company');
    }
  }

  async findByEmail(email: string): Promise<Company | null> {
    return this.prisma.company.findUnique({
      where: { email },
    });
  }

  private companyMapper(registerData: TRegisterCompany) {
    const { firstName, lastName, isAdmin, username, ...companyData } =
      registerData;

    return {
      username: username,
      email: companyData.email,
      website: companyData.website,
      address: companyData.address ?? null,
      city: companyData.city ?? null,
      state: companyData.state ?? null,
      country: companyData.country ?? null,
      postalCode: companyData.postalCode ?? null,
    };
  }

  async delete(id: string | number): Promise<Company> {
    try {
      const normalizedId = this.normalizeId(id);
      return await this.prisma.company.delete({
        where: { id: normalizedId },
      });
    } catch (error) {
      this.handleError(error, 'Company');
    }
  }

  async exists(id: string | number): Promise<boolean> {
    const normalizedId = this.normalizeId(id);
    const count = await this.prisma.company.count({
      where: { id: normalizedId },
    });
    return count > 0;
  }

  async findAllWithBusinessOwner(
    filter: TCompanyFilter,
  ): Promise<{ data: any[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...where
    } = filter;

    const baseWhere: any = {
      ...where,
      users: { some: { role: 'BUSINESS_OWNER' } },
      ...(search && {
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.company.findMany({
        where: baseWhere,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: { select: { users: true } },
          users: {
            where: { role: 'BUSINESS_OWNER' },
            select: { id: true, firstName: true, lastName: true, email: true },
            take: 1,
          },
        },
      }),
      this.prisma.company.count({ where: baseWhere }),
    ]);

    return { data, total };
  }

  async updateStatus(id: number, status: string): Promise<Company> {
    return this.prisma.company.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async getStatusSummary() {
    // Only count companies that have at least one BUSINESS_OWNER user â€”
    // this excludes platform-only companies whose sole users are SUPER_ADMIN / ADMIN.
    const withOwner = (extra: object = {}) =>
      ({ users: { some: { role: 'BUSINESS_OWNER' as any } }, ...extra }) as any;

    const [total, active, inactive, suspended, pending] = await Promise.all([
      this.prisma.company.count({ where: withOwner() }),
      this.prisma.company.count({ where: withOwner({ status: 'ACTIVE' }) }),
      this.prisma.company.count({ where: withOwner({ status: 'INACTIVE' }) }),
      this.prisma.company.count({ where: withOwner({ status: 'SUSPENDED' }) }),
      this.prisma.company.count({ where: withOwner({ status: 'PENDING' }) }),
    ]);
    return { total, active, inactive, suspended, pending };
  }

  /**
   * Per-company vulnerability summary for the admin "companies with
   * vulnerabilities" screen: how many active packages have an outstanding
   * (unfixed) vulnerability, how many distinct services those span, and
   * how many notification digests have ever been sent for the company.
   * Also surfaces whether a primary owner has been designated yet, since a
   * company with none can never receive the "team admin" half of a digest.
   *
   * Reuses the same paginated/filtered company list as the plain companies
   * screen, then runs two aggregate queries per page row — simple and
   * correct at admin-screen page sizes, matching this repository's existing
   * getStatusSummary() preference for clarity over cleverness.
   */
  async findCompaniesWithVulnerabilitySummary(
    filter: TCompanyFilter,
  ): Promise<{ data: CompanyVulnerabilitySummary[]; total: number }> {
    const { data, total } = await this.findAllWithBusinessOwner(filter);

    const summarised = await Promise.all(
      data.map(async (company) => {
        const [vulnerablePackages, notificationCount] = await Promise.all([
          this.prisma.servicePackage.findMany({
            where: {
              status: ServicePackageStatus.ACTIVE,
              service: { companyId: company.id },
              package: { vulnerabilities: { some: {} } },
            },
            select: { serviceId: true },
          }),
          this.prisma.notificationLog.count({
            where: { companyId: company.id },
          }),
        ]);

        return {
          ...company,
          vulnerablePackageCount: vulnerablePackages.length,
          affectedServiceCount: new Set(
            vulnerablePackages.map((sp) => sp.serviceId),
          ).size,
          notificationCount,
          hasPrimaryOwner: company.primaryOwnerId !== null,
        };
      }),
    );

    return { data: summarised, total };
  }

  async findByEmailOrName(
    email: string,
    username: string,
  ): Promise<Company | null> {
    return this.prisma.company.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });
  }

  /**
   * Manages the creation of a new company along with its admin user within a transaction.
   * @param registerData
   * @returns Boolean indicating success or failure.
   */
  async createWithAdminUser(
    registerData: TRegisterCompany & {
      password: string;
      subscriptionPlanId?: number | null;
    },
  ): Promise<boolean> {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const {
          firstName,
          lastName,
          isAdmin,
          password,
          subscriptionPlanId,
          ...companyData
        } = registerData;

        const company = await prisma.company.create({
          data: {
            username: companyData.username,
            email: companyData.email,
            website: companyData.website,
            address: companyData.address ?? null,
            city: companyData.city ?? null,
            state: companyData.state ?? null,
            country: companyData.country ?? null,
            postalCode: companyData.postalCode ?? null,
            status: 'PENDING',
            ...(subscriptionPlanId && {
              subscriptionPlan: { connect: { id: subscriptionPlanId } },
            }),
          },
        });

        // 2. Create the admin user for the company
        await prisma.user.create({
          data: {
            email: companyData.email,
            phone: companyData.phone ?? null,
            firstName: firstName ?? null,
            lastName: lastName ?? null,
            role: 'BUSINESS_OWNER',
            password: password,
            companyId: company.id,
          },
        });

        return true;
      });
    } catch (error) {
      this.handleError(error, 'Company with Admin User');
    }
  }
}

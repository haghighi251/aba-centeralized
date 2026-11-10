import { BaseRepository } from '@/shared/repositories/base-repository';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, User } from '@aba/database';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { TUserFilter } from '@/modules/users/dtos/userFilter';

@Injectable()
export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput,
  Prisma.UserWhereInput
> {
  private readonly logger = new Logger(UserRepository.name);

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(userData: Prisma.UserCreateInput): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: userData,
      });
    } catch (error) {
      this.handleError(error, 'User');
    }
  }

  async findById(id: string | number): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id: this.normalizeId(id) },
      });
    } catch (error) {
      this.handleError(error, 'User');
    }
  }

  async findAll(filter: TUserFilter): Promise<{ data: User[]; total: number }> {
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
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    return { data, total };
  }

  async update(
    id: string | number,
    data: Prisma.UserUpdateInput,
  ): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id: this.normalizeId(id) },
        data: {
          ...data,
        },
      });
    } catch (error) {
      this.handleError(error, 'Company');
    }
  }

  async delete(id: string | number): Promise<User> {
    try {
      const normalizedId = this.normalizeId(id);
      return await this.prisma.user.delete({
        where: { id: normalizedId },
      });
    } catch (error) {
      this.handleError(error, 'Company');
    }
  }

  async exists(id: string | number): Promise<boolean> {
    const normalizedId = this.normalizeId(id);
    const count = await this.prisma.user.count({
      where: { id: normalizedId },
    });
    return count > 0;
  }

  async findByEmailOrPhone(
    email: string,
    phone?: string | null,
  ): Promise<User | null> {
    const queryConditions: Prisma.UserWhereInput[] = [{ email }];

    if (phone) {
      queryConditions.push({ phone });
    }

    return this.prisma.user.findFirst({
      where: { OR: queryConditions },
    });
  }

  async findAllByCompany(
    companyId: number,
  ): Promise<
    (User & { teamMemberships: { team: { id: number; name: string } }[] })[]
  > {
    return this.prisma.user.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        teamMemberships: {
          include: { team: { select: { id: true, name: true } } },
        },
      },
    });
  }

  async createInCompany(data: Prisma.UserUncheckedCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { resetToken: token } });
  }

  async findByEmail(email: string): Promise<User | null> {
    this.logger.log(`[DB] findByEmail query: email="${email}"`);
    const result = await this.prisma.user.findFirst({ where: { email } });
    this.logger.log(
      `[DB] findByEmail result: ${result ? `id=${result.id}` : 'null'}`,
    );
    return result;
  }
}

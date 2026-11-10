import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { IBaseRepository } from '@/shared/types/base-repository';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@aba/database';

export abstract class BaseRepository<
  T,
  CreateDto,
  UpdateDto,
  FilterDto,
> implements IBaseRepository<T, CreateDto, UpdateDto, FilterDto> {
  constructor(protected readonly prisma: PrismaService) {}

  abstract create(data: CreateDto): Promise<T>;
  abstract findById(id: string | number): Promise<T | null>;
  abstract findAll(filter: FilterDto): Promise<{ data: T[]; total: number }>;
  abstract update(id: string | number, data: UpdateDto): Promise<T>;
  abstract delete(id: string | number): Promise<T>;
  abstract exists(id: string | number): Promise<boolean>;
  protected handleError(error: any, context: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException(`${context} already exists`);
        case 'P2025':
          throw new NotFoundException(`${context} not found`);
        default:
          throw new InternalServerErrorException(
            `Database error: ${error.code}`,
          );
      }
    }
    throw error;
  }
  protected normalizeId(id: string | number): number {
    if (typeof id === 'string') {
      const parsed = Number(id);
      if (isNaN(parsed)) {
        throw new Error(`Invalid company ID: ${id}`);
      }
      return parsed;
    }
    return id;
  }
}

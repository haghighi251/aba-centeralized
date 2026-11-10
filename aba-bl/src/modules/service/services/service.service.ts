import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import { Prisma, Service } from '@aba/database';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { CreateServiceDtoSchema } from '@/modules/service/dtos/CreateServiceDto';
import { UpdateServiceDtoSchema } from '@/modules/service/dtos/UpdateServiceDto';
import { TServiceFilter } from '@/modules/service/dtos/serviceFilter';
import { slugify } from '@/shared/utils/slugify';

@Injectable()
export class ServiceService {
  constructor(
    private readonly serviceRepository: ServiceRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  private async findEnvironmentForCompany(
    companyId: number,
    environmentId: number,
  ) {
    const environment =
      await this.environmentRepository.findById(environmentId);

    if (!environment || environment.companyId !== companyId) {
      return null;
    }

    return environment;
  }

  async createService(
    companyId: number,
    environmentId: number,
    dto: CreateServiceDtoSchema,
  ): Promise<Result<Service, Error>> {
    const environment = await this.findEnvironmentForCompany(
      companyId,
      environmentId,
    );
    if (!environment) {
      return err(new NotFoundException('Environment not found.'));
    }

    const company = await this.companyRepository.findById(companyId);
    const plan = (company as any)?.subscriptionPlan;
    if (plan && plan.maxServices !== null && !company?.payAsYouGo) {
      const count = await this.serviceRepository.countForCompany(companyId);
      if (count >= plan.maxServices) {
        return err(
          new ForbiddenException(
            `Your plan "${plan.name}" allows a maximum of ${plan.maxServices} service(s). ` +
              `Upgrade your plan or enable pay-as-you-go to add more.`,
          ),
        );
      }
    }

    const slug = dto.slug ?? slugify(dto.name);

    const existing = await this.serviceRepository.findByEnvironmentAndSlug(
      environmentId,
      slug,
    );
    if (existing) {
      return err(
        new ConflictException(
          `A service with slug "${slug}" already exists for this environment.`,
        ),
      );
    }

    const created = await this.serviceRepository.create({
      name: dto.name,
      slug,
      type: dto.type,
      description: dto.description ?? null,
      baseUrl: dto.baseUrl,
      rateLimitConfig: (dto.rateLimitConfig ??
        Prisma.JsonNull) as Prisma.InputJsonValue,
      company: { connect: { id: companyId } },
      environment: { connect: { id: environmentId } },
    });

    return ok(created);
  }

  async getServices(
    filter: TServiceFilter,
  ): Promise<Result<{ data: Service[]; total: number }, Error>> {
    const environment = await this.findEnvironmentForCompany(
      filter.companyId,
      filter.environmentId,
    );
    if (!environment) {
      return err(new NotFoundException('Environment not found.'));
    }

    const result = await this.serviceRepository.findAllForEnvironment(filter);
    return ok(result);
  }

  async getServiceById(
    companyId: number,
    environmentId: number,
    serviceId: number,
  ): Promise<Result<Service, Error>> {
    const environment = await this.findEnvironmentForCompany(
      companyId,
      environmentId,
    );
    if (!environment) {
      return err(new NotFoundException('Environment not found.'));
    }

    const service = await this.serviceRepository.findById(serviceId);

    if (!service || service.environmentId !== environmentId) {
      return err(new NotFoundException('Service not found.'));
    }

    return ok(service);
  }

  async updateService(
    companyId: number,
    environmentId: number,
    serviceId: number,
    dto: UpdateServiceDtoSchema,
  ): Promise<Result<Service, Error>> {
    const environment = await this.findEnvironmentForCompany(
      companyId,
      environmentId,
    );
    if (!environment) {
      return err(new NotFoundException('Environment not found.'));
    }

    const service = await this.serviceRepository.findById(serviceId);

    if (!service || service.environmentId !== environmentId) {
      return err(new NotFoundException('Service not found.'));
    }

    if (dto.slug && dto.slug !== service.slug) {
      const existing = await this.serviceRepository.findByEnvironmentAndSlug(
        environmentId,
        dto.slug,
      );
      if (existing) {
        return err(
          new ConflictException(
            `A service with slug "${dto.slug}" already exists for this environment.`,
          ),
        );
      }
    }

    const { rateLimitConfig, ...rest } = dto;

    const updated = await this.serviceRepository.update(serviceId, {
      ...rest,
      ...(rateLimitConfig !== undefined && {
        rateLimitConfig: (rateLimitConfig ??
          Prisma.JsonNull) as Prisma.InputJsonValue,
      }),
    });

    return ok(updated);
  }

  async deleteService(
    companyId: number,
    environmentId: number,
    serviceId: number,
  ): Promise<Result<Service, Error>> {
    const environment = await this.findEnvironmentForCompany(
      companyId,
      environmentId,
    );
    if (!environment) {
      return err(new NotFoundException('Environment not found.'));
    }

    const service = await this.serviceRepository.findById(serviceId);

    if (!service || service.environmentId !== environmentId) {
      return err(new NotFoundException('Service not found.'));
    }

    const deleted = await this.serviceRepository.delete(serviceId);

    return ok(deleted);
  }
}

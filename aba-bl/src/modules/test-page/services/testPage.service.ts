import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import { Prisma, TestAuthKind, TestPage } from '@aba/database';
import { TestPageRepository } from '@/modules/test-page/repositories/testPage.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { CryptoService } from '@/shared/security/crypto.service';
import { CreateTestPageDtoSchema } from '@/modules/test-page/dtos/CreateTestPageDto';
import { UpdateTestPageDtoSchema } from '@/modules/test-page/dtos/UpdateTestPageDto';

@Injectable()
export class TestPageService {
  constructor(
    private readonly testPageRepository: TestPageRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Validates the company → environment → service chain and returns the
   * service, or null if any link is wrong (wrong company, wrong env, missing).
   */
  private async resolveService(
    companyId: number,
    environmentId: number,
    serviceId: number,
  ) {
    const environment =
      await this.environmentRepository.findById(environmentId);
    if (!environment || environment.companyId !== companyId) return null;

    const service = await this.serviceRepository.findById(serviceId);
    if (!service || service.environmentId !== environmentId) return null;

    return service;
  }

  private async enforceTargetLimit(
    companyId: number,
    serviceId: number,
  ): Promise<Result<void, Error>> {
    const company = await this.companyRepository.findById(companyId);
    const plan = (company as any)?.subscriptionPlan;
    if (plan && plan.maxTestPages !== null && !(company as any)?.payAsYouGo) {
      const count = await this.testPageRepository.countForService(serviceId);
      if (count >= plan.maxTestPages) {
        return err(
          new ForbiddenException(
            `Your plan "${plan.name}" allows a maximum of ${plan.maxTestPages} test target(s) per service. ` +
              `Upgrade your plan or enable pay-as-you-go to add more.`,
          ),
        );
      }
    }
    return ok(undefined);
  }

  async createTarget(
    companyId: number,
    environmentId: number,
    serviceId: number,
    dto: CreateTestPageDtoSchema,
  ): Promise<Result<TestPage, Error>> {
    const service = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!service) return err(new NotFoundException('Service not found.'));

    const limit = await this.enforceTargetLimit(companyId, serviceId);
    if (limit.isErr()) return err(limit.error);

    const authSecretEnc =
      dto.authKind !== TestAuthKind.NONE && dto.authSecret
        ? this.cryptoService.encrypt(dto.authSecret)
        : null;

    const created = await this.testPageRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      pageType: dto.pageType,
      path: dto.path ?? null,
      absoluteUrl: dto.absoluteUrl ?? null,
      method: dto.method,
      authKind: dto.authKind,
      authSecretEnc,
      accessConfig: (dto.accessConfig ??
        Prisma.JsonNull) as Prisma.InputJsonValue,
      service: { connect: { id: serviceId } },
    });

    return ok(created);
  }

  async listTargets(
    companyId: number,
    environmentId: number,
    serviceId: number,
  ): Promise<Result<TestPage[], Error>> {
    const service = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!service) return err(new NotFoundException('Service not found.'));

    const targets = await this.testPageRepository.findAllForService(
      serviceId,
    );
    return ok(targets);
  }

  async getTarget(
    companyId: number,
    environmentId: number,
    serviceId: number,
    targetId: number,
  ): Promise<Result<TestPage, Error>> {
    const service = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!service) return err(new NotFoundException('Service not found.'));

    const target = await this.testPageRepository.findById(targetId);
    if (!target || target.serviceId !== serviceId) {
      return err(new NotFoundException('Test target not found.'));
    }
    return ok(target);
  }

  async updateTarget(
    companyId: number,
    environmentId: number,
    serviceId: number,
    targetId: number,
    dto: UpdateTestPageDtoSchema,
  ): Promise<Result<TestPage, Error>> {
    const existing = await this.getTarget(
      companyId,
      environmentId,
      serviceId,
      targetId,
    );
    if (existing.isErr()) return err(existing.error);

    const data: Prisma.TestPageUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.pageType !== undefined) data.pageType = dto.pageType;
    if (dto.path !== undefined) data.path = dto.path;
    if (dto.absoluteUrl !== undefined) data.absoluteUrl = dto.absoluteUrl;
    if (dto.method !== undefined) data.method = dto.method;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.accessConfig !== undefined) {
      data.accessConfig = (dto.accessConfig ??
        Prisma.JsonNull) as Prisma.InputJsonValue;
    }

    // Auth handling: setting authKind to NONE clears the secret; providing a
    // new authSecret re-encrypts it; omitting authSecret leaves it as-is.
    if (dto.authKind !== undefined) {
      data.authKind = dto.authKind;
      if (dto.authKind === TestAuthKind.NONE) {
        data.authSecretEnc = null;
      }
    }
    if (dto.authSecret !== undefined && dto.authKind !== TestAuthKind.NONE) {
      data.authSecretEnc = dto.authSecret
        ? this.cryptoService.encrypt(dto.authSecret)
        : null;
    }

    const updated = await this.testPageRepository.update(targetId, data);
    return ok(updated);
  }

  async deleteTarget(
    companyId: number,
    environmentId: number,
    serviceId: number,
    targetId: number,
  ): Promise<Result<TestPage, Error>> {
    const existing = await this.getTarget(
      companyId,
      environmentId,
      serviceId,
      targetId,
    );
    if (existing.isErr()) return err(existing.error);

    const deleted = await this.testPageRepository.delete(targetId);
    return ok(deleted);
  }
}

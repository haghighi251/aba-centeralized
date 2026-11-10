import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import {
  Prisma,
  TestDefinition,
  TestEngine,
  TestType,
} from '@aba/database';
import { TestDefinitionRepository } from '@/modules/test-definition/repositories/testDefinition.repository';
import { TestPageRepository } from '@/modules/test-page/repositories/testPage.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { CreateTestDefinitionDtoSchema } from '@/modules/test-definition/dtos/CreateTestDefinitionDto';
import { UpdateTestDefinitionDtoSchema } from '@/modules/test-definition/dtos/UpdateTestDefinitionDto';

@Injectable()
export class TestDefinitionService {
  constructor(
    private readonly testDefinitionRepository: TestDefinitionRepository,
    private readonly testPageRepository: TestPageRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  /** Validates company → env → service → target; returns null on any mismatch. */
  private async resolveTarget(
    companyId: number,
    environmentId: number,
    serviceId: number,
    targetId: number,
  ) {
    const environment =
      await this.environmentRepository.findById(environmentId);
    if (!environment || environment.companyId !== companyId) return null;

    const service = await this.serviceRepository.findById(serviceId);
    if (!service || service.environmentId !== environmentId) return null;

    const target = await this.testPageRepository.findById(targetId);
    if (!target || target.serviceId !== serviceId) return null;

    return target;
  }

  private defaultEngine(type: TestType): TestEngine {
    return type === TestType.CUSTOM_API
      ? TestEngine.POSTMAN
      : TestEngine.PLAYWRIGHT;
  }

  async createDefinition(
    companyId: number,
    environmentId: number,
    serviceId: number,
    targetId: number,
    dto: CreateTestDefinitionDtoSchema,
  ): Promise<Result<TestDefinition, Error>> {
    const target = await this.resolveTarget(
      companyId,
      environmentId,
      serviceId,
      targetId,
    );
    if (!target) return err(new NotFoundException('Test target not found.'));

    const company = await this.companyRepository.findById(companyId);
    const plan = (company as any)?.subscriptionPlan;
    if (
      plan &&
      plan.maxTestDefinitions !== null &&
      !(company as any)?.payAsYouGo
    ) {
      const count = await this.testDefinitionRepository.countForTarget(
        targetId,
      );
      if (count >= plan.maxTestDefinitions) {
        return err(
          new ForbiddenException(
            `Your plan "${plan.name}" allows a maximum of ${plan.maxTestDefinitions} test(s) per target. ` +
              `Upgrade your plan or enable pay-as-you-go to add more.`,
          ),
        );
      }
    }

    const created = await this.testDefinitionRepository.create({
      name: dto.name,
      type: dto.type,
      engine: dto.engine ?? this.defaultEngine(dto.type),
      source: dto.source,
      templateKey: dto.templateKey ?? null,
      enabled: dto.enabled,
      config: (dto.config ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      assertions: (dto.assertions ??
        Prisma.JsonNull) as Prisma.InputJsonValue,
      testPage: { connect: { id: targetId } },
    });

    return ok(created);
  }

  async listDefinitions(
    companyId: number,
    environmentId: number,
    serviceId: number,
    targetId: number,
  ): Promise<Result<TestDefinition[], Error>> {
    const target = await this.resolveTarget(
      companyId,
      environmentId,
      serviceId,
      targetId,
    );
    if (!target) return err(new NotFoundException('Test target not found.'));

    const defs = await this.testDefinitionRepository.findAllForTarget(
      targetId,
    );
    return ok(defs);
  }

  private async resolveDefinition(
    companyId: number,
    environmentId: number,
    serviceId: number,
    targetId: number,
    definitionId: number,
  ): Promise<Result<TestDefinition, Error>> {
    const target = await this.resolveTarget(
      companyId,
      environmentId,
      serviceId,
      targetId,
    );
    if (!target) return err(new NotFoundException('Test target not found.'));

    const def = await this.testDefinitionRepository.findById(definitionId);
    if (!def || def.testPageId !== targetId) {
      return err(new NotFoundException('Test definition not found.'));
    }
    return ok(def);
  }

  async updateDefinition(
    companyId: number,
    environmentId: number,
    serviceId: number,
    targetId: number,
    definitionId: number,
    dto: UpdateTestDefinitionDtoSchema,
  ): Promise<Result<TestDefinition, Error>> {
    const existing = await this.resolveDefinition(
      companyId,
      environmentId,
      serviceId,
      targetId,
      definitionId,
    );
    if (existing.isErr()) return err(existing.error);

    const data: Prisma.TestDefinitionUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.engine !== undefined) data.engine = dto.engine;
    if (dto.templateKey !== undefined) data.templateKey = dto.templateKey;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.config !== undefined) {
      data.config = (dto.config ?? Prisma.JsonNull) as Prisma.InputJsonValue;
    }
    if (dto.assertions !== undefined) {
      data.assertions = (dto.assertions ??
        Prisma.JsonNull) as Prisma.InputJsonValue;
    }

    const updated = await this.testDefinitionRepository.update(
      definitionId,
      data,
    );
    return ok(updated);
  }

  async deleteDefinition(
    companyId: number,
    environmentId: number,
    serviceId: number,
    targetId: number,
    definitionId: number,
  ): Promise<Result<TestDefinition, Error>> {
    const existing = await this.resolveDefinition(
      companyId,
      environmentId,
      serviceId,
      targetId,
      definitionId,
    );
    if (existing.isErr()) return err(existing.error);

    const deleted = await this.testDefinitionRepository.delete(definitionId);
    return ok(deleted);
  }

  /**
   * Duplicate a test so the customer can tweak a copy instead of rebuilding
   * the same configuration. The clone is disabled by default and named
   * "<name> (copy)" so it's obvious and won't run until reviewed. Respects the
   * per-page plan limit like a normal create.
   */
  async cloneDefinition(
    companyId: number,
    environmentId: number,
    serviceId: number,
    targetId: number,
    definitionId: number,
  ): Promise<Result<TestDefinition, Error>> {
    const existing = await this.resolveDefinition(
      companyId,
      environmentId,
      serviceId,
      targetId,
      definitionId,
    );
    if (existing.isErr()) return err(existing.error);
    const src = existing.value;

    const company = await this.companyRepository.findById(companyId);
    const plan = (company as any)?.subscriptionPlan;
    if (
      plan &&
      plan.maxTestDefinitions !== null &&
      !(company as any)?.payAsYouGo
    ) {
      const count = await this.testDefinitionRepository.countForTarget(
        targetId,
      );
      if (count >= plan.maxTestDefinitions) {
        return err(
          new ForbiddenException(
            `Your plan "${plan.name}" allows a maximum of ${plan.maxTestDefinitions} test(s) per page. ` +
              `Upgrade your plan or enable pay-as-you-go to add more.`,
          ),
        );
      }
    }

    const cloned = await this.testDefinitionRepository.create({
      name: `${src.name} (copy)`,
      type: src.type,
      engine: src.engine,
      source: src.source,
      templateKey: src.templateKey,
      enabled: false,
      config: (src.config ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      assertions: (src.assertions ??
        Prisma.JsonNull) as Prisma.InputJsonValue,
      testPage: { connect: { id: targetId } },
    });
    return ok(cloned);
  }
}

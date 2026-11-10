import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import {
  TestAuthKind,
  TestRun,
  TestRunStatus,
  TestRunTrigger,
} from '@aba/database';
import { TestRunRepository } from '@/modules/test-run/repositories/testRun.repository';
import { TestPageRepository } from '@/modules/test-page/repositories/testPage.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { CryptoService } from '@/shared/security/crypto.service';
import { TestScheduledProducerService } from '@/modules/test-run/services/testScheduledProducer.service';
import {
  TestScheduledDefinition,
  TestScheduledMessage,
  TestScheduledTarget,
} from '@/modules/kafka/types/testRunMessages';
import { TestRunMaterials } from '@/modules/test-run/types/testRunMaterials';

type TargetWithDefs = Awaited<
  ReturnType<TestPageRepository['findOneWithEnabledDefinitions']>
>;

@Injectable()
export class TestRunService {
  constructor(
    private readonly testRunRepository: TestRunRepository,
    private readonly testPageRepository: TestPageRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly cryptoService: CryptoService,
    private readonly producer: TestScheduledProducerService,
  ) {}

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

  private startOfMonth(now: Date = new Date()): Date {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  /**
   * Resolve the targets (and their enabled definitions) a run covers: one
   * target when `targetId` is given, otherwise every active target. Used both
   * when triggering a run and when the executor later fetches materials, so
   * the two always agree on which targets are in scope.
   */
  private async resolveRunTargets(
    serviceId: number,
    targetId?: number,
  ): Promise<NonNullable<TargetWithDefs>[]> {
    if (targetId) {
      const target =
        await this.testPageRepository.findOneWithEnabledDefinitions(
          targetId,
        );
      if (!target || target.serviceId !== serviceId) return [];
      return [target];
    }
    return this.testPageRepository.findActiveWithEnabledDefinitions(
      serviceId,
    );
  }

  async triggerRun(
    companyId: number,
    environmentId: number,
    serviceId: number,
    pageId: number | undefined,
    definitionId: number | undefined,
    triggeredByUserId: number | null,
  ): Promise<Result<TestRun, Error>> {
    const service = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!service) return err(new NotFoundException('Service not found.'));

    // Plan limit: runs per company per calendar month.
    const company = await this.companyRepository.findById(companyId);
    const plan = (company as any)?.subscriptionPlan;
    if (
      plan &&
      plan.maxTestRunsPerMonth !== null &&
      !(company as any)?.payAsYouGo
    ) {
      const used = await this.testRunRepository.countForCompanySince(
        companyId,
        this.startOfMonth(),
      );
      if (used >= plan.maxTestRunsPerMonth) {
        return err(
          new ForbiddenException(
            `Your plan "${plan.name}" allows ${plan.maxTestRunsPerMonth} test run(s) per month. ` +
              `Upgrade your plan or enable pay-as-you-go to run more.`,
          ),
        );
      }
    }

    const pages = await this.resolveRunTargets(serviceId, pageId);
    if (pageId && pages.length === 0) {
      return err(new NotFoundException('Test page not found.'));
    }

    const scheduledTargets: TestScheduledTarget[] = pages
      .map((t) => ({
        ...t,
        // When a single test was requested, run only that definition.
        testDefinitions: definitionId
          ? t.testDefinitions.filter((d) => d.id === definitionId)
          : t.testDefinitions,
      }))
      .filter((t) => t.testDefinitions.length > 0)
      .map((t) => ({
        targetId: t.id,
        name: t.name,
        path: t.path,
        absoluteUrl: t.absoluteUrl,
        method: t.method,
        authKind: t.authKind,
        accessConfig: (t.accessConfig as Record<string, unknown> | null) ?? null,
        definitions: t.testDefinitions.map(
          (d): TestScheduledDefinition => ({
            definitionId: d.id,
            name: d.name,
            type: d.type,
            engine: d.engine,
            config: (d.config as Record<string, unknown> | null) ?? null,
            assertions:
              (d.assertions as Record<string, unknown> | null) ?? null,
            templateKey: d.templateKey,
          }),
        ),
      }));

    const totalDefinitions = scheduledTargets.reduce(
      (sum, t) => sum + t.definitions.length,
      0,
    );
    if (totalDefinitions === 0) {
      return err(
        new BadRequestException(
          'No enabled tests to run. Add at least one enabled test definition first.',
        ),
      );
    }

    const runKey = randomUUID();
    const run = await this.testRunRepository.create({
      runKey,
      trigger: TestRunTrigger.MANUAL,
      status: TestRunStatus.QUEUED,
      totalCount: totalDefinitions,
      service: { connect: { id: serviceId } },
      ...(pageId && { testPage: { connect: { id: pageId } } }),
      ...(triggeredByUserId && {
        triggeredBy: { connect: { id: triggeredByUserId } },
      }),
    });

    const message: TestScheduledMessage = {
      runKey,
      companyId,
      serviceId,
      baseUrl: service.baseUrl,
      rateLimitConfig:
        (service.rateLimitConfig as { windowMs: number; max: number } | null) ??
        null,
      targets: scheduledTargets,
    };
    await this.producer.publish(message);

    return ok(run);
  }

  async listRuns(
    companyId: number,
    environmentId: number,
    serviceId: number,
  ): Promise<Result<TestRun[], Error>> {
    const service = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!service) return err(new NotFoundException('Service not found.'));

    const runs = await this.testRunRepository.findAllForService(serviceId);
    return ok(runs);
  }

  async getRunById(
    companyId: number,
    environmentId: number,
    serviceId: number,
    runId: number,
  ): Promise<Result<NonNullable<Awaited<ReturnType<TestRunRepository['findByIdWithResults']>>>, Error>> {
    const service = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!service) return err(new NotFoundException('Service not found.'));

    const run = await this.testRunRepository.findByIdWithResults(runId);
    if (!run || run.serviceId !== serviceId) {
      return err(new NotFoundException('Test run not found.'));
    }
    return ok(run);
  }

  /**
   * Internal: resolve decrypted auth material for a run's targets. Guarded by
   * INTERNAL_API_KEY at the controller — no company scoping here.
   */
  async getMaterials(
    runKey: string,
  ): Promise<Result<TestRunMaterials, Error>> {
    const run = await this.testRunRepository.findByRunKey(runKey);
    if (!run) return err(new NotFoundException('Test run not found.'));

    const targets = await this.resolveRunTargets(
      run.serviceId,
      run.testPageId ?? undefined,
    );

    const materials: TestRunMaterials = {
      runKey,
      targets: targets.map((t) => ({
        targetId: t.id,
        authKind: t.authKind,
        authSecret:
          t.authKind !== TestAuthKind.NONE && t.authSecretEnc
            ? this.cryptoService.decrypt(t.authSecretEnc)
            : null,
      })),
    };
    return ok(materials);
  }
}

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import { err, ok, Result } from 'neverthrow';
import {
  ActivityEventType,
  RepositoryTriggerMode,
  ServiceRepositoryConnection,
} from '@aba/database';
import { RepositoryConnectionRepository } from '@/modules/repository-connection/repositories/repositoryConnection.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { CompanyRepository } from '@/modules/company/repositories/company.repository';
import { ActivityLogRepository } from '@/shared/repositories/activityLog.repository';
import { CryptoService } from '@/shared/security/crypto.service';
import { CreateRepositoryConnectionDtoSchema } from '@/modules/repository-connection/dtos/CreateRepositoryConnectionDto';
import { UpdateRepositoryConnectionTriggerSettingsDtoSchema } from '@/modules/repository-connection/dtos/UpdateRepositoryConnectionTriggerSettingsDto';

export type RepositoryConnectionView = Omit<
  ServiceRepositoryConnection,
  'webhookToken' | 'webhookSecretEnc'
>;

export type RepositoryConnectionSecretReveal = {
  connection: RepositoryConnectionView;
  webhookToken: string;
  webhookSecret: string;
};

function toView(
  connection: ServiceRepositoryConnection,
): RepositoryConnectionView {
  const { webhookToken, webhookSecretEnc, ...view } = connection;
  return view;
}

@Injectable()
export class RepositoryConnectionService {
  constructor(
    private readonly repositoryConnectionRepository: RepositoryConnectionRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly activityLogRepository: ActivityLogRepository,
    private readonly cryptoService: CryptoService,
  ) {}

  private async resolveService(
    companyId: number,
    environmentId: number,
    serviceId: number,
  ) {
    const environment =
      await this.environmentRepository.findById(environmentId);
    if (!environment || environment.companyId !== companyId) {
      return null;
    }
    const service = await this.serviceRepository.findById(serviceId);
    if (!service || service.environmentId !== environmentId) {
      return null;
    }
    return { service, environment };
  }

  private generateCredentials(): { webhookToken: string; webhookSecret: string } {
    return {
      webhookToken: randomUUID(),
      webhookSecret: randomBytes(32).toString('hex'),
    };
  }

  /**
   * Resolves the cadence a new connection should start with. Explicit
   * fields on the DTO always win (customer choice). Otherwise: a
   * production-environment branch defaults to INSTANT on any paid plan
   * (free tier — monthlyPrice 0 — is carved out and falls through to the
   * plan/system default like any other branch); everything else uses the
   * plan's configured default, or a hardcoded system default if the plan
   * hasn't set one.
   */
  private resolveTriggerSettings(
    dto: CreateRepositoryConnectionDtoSchema,
    plan: {
      monthlyPrice: number;
      name: string;
      defaultTriggerMode: RepositoryTriggerMode | null;
      defaultPushCountThreshold: number | null;
      defaultIntervalDays: number | null;
    } | null,
    isProduction: boolean,
  ): {
    triggerMode: RepositoryTriggerMode;
    pushCountThreshold: number | null;
    intervalDays: number | null;
  } {
    if (dto.triggerMode) {
      return {
        triggerMode: dto.triggerMode,
        pushCountThreshold: dto.pushCountThreshold ?? null,
        intervalDays: dto.intervalDays ?? null,
      };
    }

    const isFreeTier = !plan || plan.monthlyPrice === 0;
    if (isProduction && !isFreeTier) {
      return {
        triggerMode: RepositoryTriggerMode.INSTANT,
        pushCountThreshold: null,
        intervalDays: null,
      };
    }

    return {
      triggerMode: plan?.defaultTriggerMode ?? RepositoryTriggerMode.PUSH_COUNT,
      pushCountThreshold: plan?.defaultPushCountThreshold ?? 5,
      intervalDays: plan?.defaultIntervalDays ?? 7,
    };
  }

  async create(
    companyId: number,
    environmentId: number,
    serviceId: number,
    actingUserId: number,
    dto: CreateRepositoryConnectionDtoSchema,
  ): Promise<Result<RepositoryConnectionSecretReveal, Error>> {
    const resolved = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!resolved) {
      return err(new NotFoundException('Service or environment not found.'));
    }
    const { environment } = resolved;

    const existing =
      await this.repositoryConnectionRepository.findByServiceId(serviceId);
    if (existing) {
      return err(
        new ConflictException(
          'This service already has a connected repository. Disconnect it first.',
        ),
      );
    }

    const company = await this.companyRepository.findById(companyId);
    const plan = (company as any)?.subscriptionPlan;
    if (
      plan &&
      plan.maxMonitoredBranches !== null &&
      !company?.payAsYouGo
    ) {
      const count =
        await this.repositoryConnectionRepository.countForCompany(companyId);
      if (count >= plan.maxMonitoredBranches) {
        return err(
          new ForbiddenException(
            `Your plan "${plan.name}" allows a maximum of ${plan.maxMonitoredBranches} monitored branch(es). ` +
              `Upgrade your plan or enable pay-as-you-go to connect more.`,
          ),
        );
      }
    }

    const { webhookToken, webhookSecret } = this.generateCredentials();
    const webhookSecretEnc = this.cryptoService.encrypt(webhookSecret);
    const triggerSettings = this.resolveTriggerSettings(
      dto,
      plan ?? null,
      environment.isProduction,
    );

    const created = await this.repositoryConnectionRepository.create({
      provider: dto.provider,
      owner: dto.owner,
      name: dto.name,
      watchedBranch: dto.watchedBranch,
      webhookToken,
      webhookSecretEnc,
      serviceId,
      connectedById: actingUserId,
      ...triggerSettings,
    });

    await this.activityLogRepository.create({
      eventType: ActivityEventType.REPOSITORY_CONNECTED,
      actorUserId: actingUserId,
      companyId,
      environmentId,
      serviceId,
      metadata: {
        provider: dto.provider,
        owner: dto.owner,
        name: dto.name,
        branch: dto.watchedBranch,
      },
    });

    return ok({ connection: toView(created), webhookToken, webhookSecret });
  }

  async get(
    companyId: number,
    environmentId: number,
    serviceId: number,
  ): Promise<Result<RepositoryConnectionView | null, Error>> {
    const resolved = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!resolved) {
      return err(new NotFoundException('Service or environment not found.'));
    }

    const connection =
      await this.repositoryConnectionRepository.findByServiceId(serviceId);
    return ok(connection ? toView(connection) : null);
  }

  async rotateSecret(
    companyId: number,
    environmentId: number,
    serviceId: number,
    actingUserId: number,
  ): Promise<Result<RepositoryConnectionSecretReveal, Error>> {
    const resolved = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!resolved) {
      return err(new NotFoundException('Service or environment not found.'));
    }

    const existing =
      await this.repositoryConnectionRepository.findByServiceId(serviceId);
    if (!existing) {
      return err(new NotFoundException('Repository connection not found.'));
    }

    const { webhookToken, webhookSecret } = this.generateCredentials();
    const webhookSecretEnc = this.cryptoService.encrypt(webhookSecret);

    const updated = await this.repositoryConnectionRepository.rotateSecret(
      existing.id,
      webhookToken,
      webhookSecretEnc,
      actingUserId,
    );

    await this.activityLogRepository.create({
      eventType: ActivityEventType.REPOSITORY_SECRET_ROTATED,
      actorUserId: actingUserId,
      companyId,
      environmentId,
      serviceId,
    });

    return ok({ connection: toView(updated), webhookToken, webhookSecret });
  }

  /**
   * Customer-driven cadence override — always available on any plan; the
   * plan only decides what gets pre-filled at connection-creation time.
   */
  async updateTriggerSettings(
    companyId: number,
    environmentId: number,
    serviceId: number,
    actingUserId: number,
    dto: UpdateRepositoryConnectionTriggerSettingsDtoSchema,
  ): Promise<Result<RepositoryConnectionView, Error>> {
    const resolved = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!resolved) {
      return err(new NotFoundException('Service or environment not found.'));
    }

    const existing =
      await this.repositoryConnectionRepository.findByServiceId(serviceId);
    if (!existing) {
      return err(new NotFoundException('Repository connection not found.'));
    }

    const updated = await this.repositoryConnectionRepository.updateTriggerSettings(
      existing.id,
      {
        triggerMode: dto.triggerMode,
        pushCountThreshold: dto.pushCountThreshold ?? null,
        intervalDays: dto.intervalDays ?? null,
      },
    );

    await this.activityLogRepository.create({
      eventType: ActivityEventType.REPOSITORY_TRIGGER_SETTINGS_UPDATED,
      actorUserId: actingUserId,
      companyId,
      environmentId,
      serviceId,
      metadata: {
        triggerMode: dto.triggerMode,
        pushCountThreshold: dto.pushCountThreshold ?? null,
        intervalDays: dto.intervalDays ?? null,
      },
    });

    return ok(toView(updated));
  }

  async remove(
    companyId: number,
    environmentId: number,
    serviceId: number,
    actingUserId: number,
  ): Promise<Result<null, Error>> {
    const resolved = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!resolved) {
      return err(new NotFoundException('Service or environment not found.'));
    }

    const existing =
      await this.repositoryConnectionRepository.findByServiceId(serviceId);
    if (!existing) {
      return err(new NotFoundException('Repository connection not found.'));
    }

    await this.repositoryConnectionRepository.delete(existing.id);

    await this.activityLogRepository.create({
      eventType: ActivityEventType.REPOSITORY_DISCONNECTED,
      actorUserId: actingUserId,
      companyId,
      environmentId,
      serviceId,
      metadata: { owner: existing.owner, name: existing.name },
    });

    return ok(null);
  }
}

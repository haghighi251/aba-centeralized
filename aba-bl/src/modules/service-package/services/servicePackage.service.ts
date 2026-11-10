import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';
import {
  ActivityEventType,
  DependencyEcosystem,
  Package,
  ServicePackageNotificationState,
} from '@aba/database';
import { PackageRepository } from '@/modules/service-package/repositories/package.repository';
import {
  ServicePackageRepository,
  ServicePackageWithPackage,
} from '@/modules/service-package/repositories/servicePackage.repository';
import { ServicePackageNotificationStateRepository } from '@/modules/service-package/repositories/servicePackageNotificationState.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { VulnerabilityScanService } from '@/modules/service-package/services/vulnerability-scan.service';
import {
  ActivityLogRepository,
  CreateActivityLogInput,
} from '@/shared/repositories/activityLog.repository';
import { CreateServicePackageDtoSchema } from '@/modules/service-package/dtos/CreateServicePackageDto';
import { UpdateServicePackageDtoSchema } from '@/modules/service-package/dtos/UpdateServicePackageDto';
import { BulkPackageItem } from '@/modules/service-package/dtos/BulkImportServicePackagesDto';
import { UpdateServicePackageNotificationDtoSchema } from '@/modules/service-package/dtos/UpdateServicePackageNotificationDto';
import {
  TServicePackageFilter,
  TServicePackageHistoryFilter,
} from '@/modules/service-package/dtos/servicePackageFilter';

export type BulkImportResult = {
  added: number;
  updated: number;
  unchanged: number;
  staled: number;
};

@Injectable()
export class ServicePackageService {
  private readonly logger = new Logger(ServicePackageService.name);

  constructor(
    private readonly packageRepository: PackageRepository,
    private readonly servicePackageRepository: ServicePackageRepository,
    private readonly serviceRepository: ServiceRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly vulnerabilityScanService: VulnerabilityScanService,
    private readonly notificationStateRepository: ServicePackageNotificationStateRepository,
    private readonly activityLogRepository: ActivityLogRepository,
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
    return service;
  }

  async getActivePackages(
    filter: TServicePackageFilter,
  ): Promise<
    Result<{ data: ServicePackageWithPackage[]; total: number }, Error>
  > {
    const service = await this.resolveService(
      filter.companyId,
      filter.environmentId,
      filter.serviceId,
    );
    if (!service) {
      return err(new NotFoundException('Service or environment not found.'));
    }
    const result = await this.servicePackageRepository.findActive(filter);
    return ok(result);
  }

  async getPackageHistory(
    filter: TServicePackageHistoryFilter,
  ): Promise<
    Result<{ data: ServicePackageWithPackage[]; total: number }, Error>
  > {
    const service = await this.resolveService(
      filter.companyId,
      filter.environmentId,
      filter.serviceId,
    );
    if (!service) {
      return err(new NotFoundException('Service or environment not found.'));
    }
    const result = await this.servicePackageRepository.findHistory(filter);
    return ok(result);
  }

  async createPackage(
    companyId: number,
    environmentId: number,
    serviceId: number,
    actingUserId: number,
    dto: CreateServicePackageDtoSchema,
  ): Promise<Result<ServicePackageWithPackage, Error>> {
    const service = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!service) {
      return err(new NotFoundException('Service or environment not found.'));
    }

    const pkg = await this.packageRepository.findOrCreate(
      dto.ecosystem,
      dto.name,
      dto.version,
    );

    const existing =
      await this.servicePackageRepository.findActiveByServiceAndPackageName(
        serviceId,
        dto.name,
        dto.ecosystem,
      );

    let replacedExisting = false;

    if (existing) {
      if (existing.packageId === pkg.id) {
        return err(
          new ConflictException(
            `Package "${dto.name}@${dto.version}" is already active for this service.`,
          ),
        );
      }
      await this.servicePackageRepository.markAsStale(existing.id);
      replacedExisting = true;
    }

    const created = await this.servicePackageRepository.create({
      versionRange: dto.versionRange ?? null,
      service: { connect: { id: serviceId } },
      package: { connect: { id: pkg.id } },
    });

    this.triggerScan([pkg], serviceId, service.companyId);

    // Replacing an existing active package with a new version is a
    // remediation action (a version bump), same as the dedicated update
    // endpoint — log it for the audit trail. A brand-new addition is not.
    if (replacedExisting) {
      await this.activityLogRepository.create({
        eventType: ActivityEventType.PACKAGE_UPDATED,
        actorUserId: actingUserId,
        companyId,
        environmentId,
        serviceId,
        servicePackageId: created.id,
        metadata: { packageName: pkg.name, newVersion: pkg.version },
      });
    }

    return ok(created);
  }

  async updatePackage(
    companyId: number,
    environmentId: number,
    serviceId: number,
    servicePackageId: number,
    actingUserId: number,
    dto: UpdateServicePackageDtoSchema,
  ): Promise<Result<ServicePackageWithPackage, Error>> {
    const service = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!service) {
      return err(new NotFoundException('Service or environment not found.'));
    }

    const current =
      await this.servicePackageRepository.findById(servicePackageId);
    if (
      !current ||
      current.serviceId !== serviceId ||
      current.status !== 'ACTIVE'
    ) {
      return err(new NotFoundException('Active service package not found.'));
    }

    const newEcosystem = (dto.ecosystem ??
      current.package.ecosystem) as DependencyEcosystem;
    const newVersion = dto.version ?? current.package.version;
    const versionChanged =
      newVersion !== current.package.version ||
      newEcosystem !== current.package.ecosystem;

    if (versionChanged) {
      const newPkg = await this.packageRepository.findOrCreate(
        newEcosystem,
        current.package.name,
        newVersion,
      );

      if (newPkg.id === current.packageId && dto.versionRange === undefined) {
        return err(
          new ConflictException(
            `Package "${current.package.name}@${newVersion}" is already the active version.`,
          ),
        );
      }

      await this.servicePackageRepository.markAsStale(current.id);

      const updated = await this.servicePackageRepository.create({
        versionRange:
          dto.versionRange !== undefined
            ? dto.versionRange
            : current.versionRange,
        service: { connect: { id: serviceId } },
        package: { connect: { id: newPkg.id } },
      });

      await this.activityLogRepository.create({
        eventType: ActivityEventType.PACKAGE_UPDATED,
        actorUserId: actingUserId,
        companyId,
        environmentId,
        serviceId,
        servicePackageId: updated.id,
        metadata: {
          packageName: current.package.name,
          previousVersion: current.package.version,
          newVersion,
        },
      });

      return ok(updated);
    }

    const updated = await this.servicePackageRepository.update(
      servicePackageId,
      {
        versionRange:
          dto.versionRange !== undefined ? dto.versionRange : undefined,
      },
    );

    return ok(updated);
  }

  async removePackage(
    companyId: number,
    environmentId: number,
    serviceId: number,
    servicePackageId: number,
    actingUserId: number,
  ): Promise<Result<ServicePackageWithPackage, Error>> {
    const service = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!service) {
      return err(new NotFoundException('Service or environment not found.'));
    }

    const current =
      await this.servicePackageRepository.findById(servicePackageId);
    if (
      !current ||
      current.serviceId !== serviceId ||
      current.status !== 'ACTIVE'
    ) {
      return err(new NotFoundException('Active service package not found.'));
    }

    const removed = await this.servicePackageRepository.markAsRemoved(
      current.id,
    );

    await this.activityLogRepository.create({
      eventType: ActivityEventType.PACKAGE_REMOVED,
      actorUserId: actingUserId,
      companyId,
      environmentId,
      serviceId,
      servicePackageId: current.id,
      metadata: {
        packageName: current.package.name,
        version: current.package.version,
      },
    });

    return ok(removed);
  }

  async bulkImport(
    companyId: number,
    environmentId: number,
    serviceId: number,
    actingUserId: number,
    ecosystem: DependencyEcosystem,
    packages: BulkPackageItem[],
  ): Promise<Result<BulkImportResult, Error>> {
    const service = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!service) {
      return err(new NotFoundException('Service or environment not found.'));
    }

    let added = 0;
    let updated = 0;
    let unchanged = 0;
    let staled = 0;
    const packagesToScan: Package[] = [];

    for (const item of packages) {
      const pkg = await this.packageRepository.findOrCreate(
        ecosystem,
        item.name,
        item.version,
      );

      const existing =
        await this.servicePackageRepository.findActiveByServiceAndPackageName(
          serviceId,
          item.name,
          ecosystem,
        );

      if (existing) {
        if (existing.packageId === pkg.id) {
          if (
            item.versionRange !== undefined &&
            item.versionRange !== existing.versionRange
          ) {
            await this.servicePackageRepository.update(existing.id, {
              versionRange: item.versionRange,
            });
            updated++;
          } else {
            unchanged++;
          }
        } else {
          await this.servicePackageRepository.markAsStale(existing.id);
          staled++;
          const replaced = await this.servicePackageRepository.create({
            versionRange: item.versionRange ?? null,
            service: { connect: { id: serviceId } },
            package: { connect: { id: pkg.id } },
          });
          packagesToScan.push(pkg);
          added++;

          // A version bump via re-import is the same remediation action as
          // the dedicated update endpoint — log it per package, not once for
          // the whole batch, so each entry stays meaningful on its own.
          await this.activityLogRepository.create({
            eventType: ActivityEventType.PACKAGE_UPDATED,
            actorUserId: actingUserId,
            companyId,
            environmentId,
            serviceId,
            servicePackageId: replaced.id,
            metadata: {
              packageName: item.name,
              previousVersion: existing.package.version,
              newVersion: item.version,
              via: 'bulk_import',
            },
          });
        }
      } else {
        await this.servicePackageRepository.create({
          versionRange: item.versionRange ?? null,
          service: { connect: { id: serviceId } },
          package: { connect: { id: pkg.id } },
        });
        packagesToScan.push(pkg);
        added++;
      }
    }

    if (packagesToScan.length > 0) {
      this.triggerScan(packagesToScan, serviceId, service.companyId);
    }

    return ok({ added, updated, unchanged, staled });
  }

  private triggerScan(
    packages: Package[],
    serviceId: number,
    companyId: number,
  ): void {
    this.vulnerabilityScanService
      .scanPackages(packages, serviceId, companyId)
      .catch((err) =>
        this.logger.error('Vulnerability scan failed', err?.message),
      );
  }

  /**
   * Mutes, unmutes, or snoozes vulnerability-digest notifications for one
   * package on this service. Shared/service-wide state — not personal to the
   * acting user — so it affects the single combined digest for every
   * recipient of this service, per the product decision that mute/snooze is
   * a property of the package itself, not of who set it.
   */
  async updateNotificationPreference(
    companyId: number,
    environmentId: number,
    serviceId: number,
    servicePackageId: number,
    actingUserId: number,
    dto: UpdateServicePackageNotificationDtoSchema,
  ): Promise<Result<ServicePackageNotificationState, Error>> {
    const service = await this.resolveService(
      companyId,
      environmentId,
      serviceId,
    );
    if (!service) {
      return err(new NotFoundException('Service or environment not found.'));
    }

    const current =
      await this.servicePackageRepository.findById(servicePackageId);
    if (!current || current.serviceId !== serviceId) {
      return err(new NotFoundException('Service package not found.'));
    }

    let state: ServicePackageNotificationState;
    let eventType: ActivityEventType;
    let metadata: CreateActivityLogInput['metadata'];

    if (dto.action === 'MUTE') {
      state = await this.notificationStateRepository.mute(
        servicePackageId,
        actingUserId,
      );
      eventType = ActivityEventType.PACKAGE_MUTED;
    } else if (dto.action === 'UNMUTE') {
      state = await this.notificationStateRepository.unmute(servicePackageId);
      eventType = ActivityEventType.PACKAGE_UNMUTED;
    } else {
      state = await this.notificationStateRepository.snooze(
        servicePackageId,
        dto.until,
      );
      eventType = ActivityEventType.PACKAGE_SNOOZED;
      metadata = { until: dto.until.toISOString() };
    }

    await this.activityLogRepository.create({
      eventType,
      actorUserId: actingUserId,
      companyId,
      environmentId,
      serviceId,
      servicePackageId,
      metadata,
    });

    return ok(state);
  }
}

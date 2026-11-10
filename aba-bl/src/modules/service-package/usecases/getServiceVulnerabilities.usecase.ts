import { Injectable } from '@nestjs/common';
import { UseCase } from '@/modules/shared/types/useCase';
import { VulnerabilityScanService } from '@/modules/service-package/services/vulnerability-scan.service';
import {
  VulnerabilityRepository,
  ServiceVulnerabilityResult,
} from '@/modules/service-package/repositories/vulnerability.repository';
import { ServicePackageService } from '@/modules/service-package/services/servicePackage.service';
import { NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@/modules/environment/repositories/environment.repository';
import { ServiceRepository } from '@/modules/service/repositories/service.repository';
import { PrismaService } from '@/modules/shared/services/prisma/prisma.service';
import { ServicePackageStatus } from '@aba/database';

interface Request {
  companyId: number;
  environmentId: number;
  serviceId: number;
  severity?: string;
  search?: string;
}

@Injectable()
export class GetServiceVulnerabilitiesUseCase implements UseCase<
  Request,
  { data: ServiceVulnerabilityResult[]; total: number }
> {
  constructor(
    private readonly vulnerabilityRepository: VulnerabilityRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(
    request: Request,
  ): Promise<{ data: ServiceVulnerabilityResult[]; total: number }> {
    const { companyId, environmentId, serviceId, severity, search } = request;

    const environment =
      await this.environmentRepository.findById(environmentId);
    if (!environment || environment.companyId !== companyId) {
      throw new NotFoundException('Service or environment not found.');
    }
    const service = await this.serviceRepository.findById(serviceId);
    if (!service || service.environmentId !== environmentId) {
      throw new NotFoundException('Service or environment not found.');
    }

    const result = await this.vulnerabilityRepository.findByService(serviceId, {
      severity,
      search,
    });
    return result;
  }
}

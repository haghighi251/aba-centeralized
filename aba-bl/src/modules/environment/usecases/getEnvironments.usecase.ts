import { Injectable } from '@nestjs/common';
import { Environment } from '@aba/database';
import { UseCase } from '@/modules/shared/types/useCase';
import { EnvironmentService } from '@/modules/environment/services/environment.service';
import { TEnvironmentFilter } from '@/modules/environment/dtos/environmentFilter';

@Injectable()
export class GetEnvironmentsUseCase implements UseCase<
  TEnvironmentFilter,
  { data: Environment[]; total: number }
> {
  constructor(private readonly environmentService: EnvironmentService) {}

  async execute(
    filter: TEnvironmentFilter,
  ): Promise<{ data: Environment[]; total: number }> {
    return this.environmentService.getEnvironments(filter);
  }
}

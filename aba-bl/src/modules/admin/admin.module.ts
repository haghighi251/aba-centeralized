import { Module } from '@nestjs/common';
import { PackagesService } from '@/modules/shared/services/packages/packages.service';
import { PricingPackageRepository } from '@/modules/shared/repositories/pricingPackage.repository';

@Module({
  controllers: [],
  providers: [PackagesService, PricingPackageRepository],
  exports: [PackagesService],
})
export class AdminPackagesModule {}

import {
  PackagesType,
  PricingPackageResponse,
  toPricingPackageResponse,
} from '@/modules/shared/dtos/packages';
import { PricingPackageRepository } from '@/modules/shared/repositories/pricingPackage.repository';
import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

@Injectable()
export class PackagesService {
  constructor(
    private readonly pricingPackageRepository: PricingPackageRepository,
  ) {}

  async getAllPackages(): Promise<Result<PricingPackageResponse[], Error>> {
    const { data } = await this.pricingPackageRepository.findAll({});

    return ok(data.map(toPricingPackageResponse));
  }

  async getPackageById(
    packageId: number,
  ): Promise<Result<PricingPackageResponse | undefined, Error>> {
    const pricingPackage =
      await this.pricingPackageRepository.findById(packageId);

    if (!pricingPackage) return ok(undefined);

    return ok(toPricingPackageResponse(pricingPackage));
  }

  async addNewPackage(
    newPackageData: PackagesType,
  ): Promise<Result<boolean, Error>> {
    const created = await this.pricingPackageRepository.create({
      type: newPackageData.type,
      requestTokensLength: newPackageData.requestTokensLength,
      requestTokensPrice: newPackageData.requestTokensPrice,
      responseTokensLength: newPackageData.responseTokensLength,
      responseTokensPrice: newPackageData.responseTokensPrice,
    });

    if (!created) return err(undefined);

    return ok(true);
  }

  async deletePackageById(packageId: number): Promise<Result<true, Error>> {
    const existing = await this.pricingPackageRepository.findById(packageId);

    if (!existing) return ok(undefined);

    await this.pricingPackageRepository.delete(packageId);

    return ok(true);
  }

  async updatePackage(
    packageId: number,
    updatedData: Partial<PackagesType>,
  ): Promise<Result<PricingPackageResponse, Error>> {
    const existing = await this.pricingPackageRepository.findById(packageId);

    if (!existing) {
      return err(new Error('Package not found or update failed.'));
    }

    const updated = await this.pricingPackageRepository.update(
      packageId,
      updatedData,
    );

    return ok(toPricingPackageResponse(updated));
  }
}

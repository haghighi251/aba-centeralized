import { z } from 'zod';
import { PricingPackage } from '@aba/database';

export const PackagesSchema = z.object({
  type: z.string({ message: 'You should add a type' }),
  requestTokensLength: z.string({ message: 'The RQ token number is not set.' }),
  requestTokensPrice: z.string({ message: 'Request token price is not set' }),
  responseTokensLength: z.string({
    message: 'The RS token number is not set.',
  }),
  responseTokensPrice: z.string({ message: 'Response token price is not set' }),
});

export type PackagesType = z.infer<typeof PackagesSchema>;

export type PricingPackageResponse = PackagesType & { id: number };

export function toPricingPackageResponse(
  pricingPackage: PricingPackage,
): PricingPackageResponse {
  return {
    id: pricingPackage.id,
    type: pricingPackage.type,
    requestTokensLength: pricingPackage.requestTokensLength,
    requestTokensPrice: pricingPackage.requestTokensPrice,
    responseTokensLength: pricingPackage.responseTokensLength,
    responseTokensPrice: pricingPackage.responseTokensPrice,
  };
}

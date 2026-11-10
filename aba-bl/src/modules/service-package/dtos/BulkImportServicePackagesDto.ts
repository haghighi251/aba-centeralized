import { z } from 'zod';
import { DependencyEcosystem } from '@aba/database';

const BulkPackageItemSchema = z.object({
  name: z.string().min(1).max(255),
  version: z.string().min(1).max(100),
  versionRange: z.string().max(100).optional(),
});

export const BulkImportServicePackagesDto = z.object({
  ecosystem: z.nativeEnum(DependencyEcosystem).default(DependencyEcosystem.NPM),
  packages: z
    .array(BulkPackageItemSchema)
    .min(1, { message: 'At least one package is required.' })
    .max(1000, { message: 'Maximum 1000 packages per import.' }),
});

export type BulkImportServicePackagesDtoSchema = z.infer<
  typeof BulkImportServicePackagesDto
>;
export type BulkPackageItem = z.infer<typeof BulkPackageItemSchema>;

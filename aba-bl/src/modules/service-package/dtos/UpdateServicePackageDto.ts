import { z } from 'zod';
import { DependencyEcosystem } from '@aba/database';

export const UpdateServicePackageDto = z
  .object({
    version: z.string().min(1).max(100).optional(),
    versionRange: z.string().max(100).nullable().optional(),
    ecosystem: z.nativeEnum(DependencyEcosystem).optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided.',
  });

export type UpdateServicePackageDtoSchema = z.infer<
  typeof UpdateServicePackageDto
>;

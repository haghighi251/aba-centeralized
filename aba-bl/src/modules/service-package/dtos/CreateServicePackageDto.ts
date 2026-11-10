import { z } from 'zod';
import { DependencyEcosystem } from '@aba/database';

export const CreateServicePackageDto = z.object({
  name: z.string().min(1, { message: 'Name is required.' }).max(255),
  version: z.string().min(1, { message: 'Version is required.' }).max(100),
  versionRange: z.string().max(100).optional(),
  ecosystem: z.nativeEnum(DependencyEcosystem).default(DependencyEcosystem.NPM),
});

export type CreateServicePackageDtoSchema = z.infer<
  typeof CreateServicePackageDto
>;

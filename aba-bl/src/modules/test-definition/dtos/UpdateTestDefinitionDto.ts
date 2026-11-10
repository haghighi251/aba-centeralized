import { z } from 'zod';
import { TestEngine } from '@aba/database';
import {
  TestAssertionsSchema,
  TestConfigSchema,
} from '@/modules/test-definition/dtos/CreateTestDefinitionDto';

/**
 * All fields optional. `type` is intentionally immutable after creation (it
 * decides the engine and executor path); change it by recreating the test.
 */
export const UpdateTestDefinitionDto = z
  .object({
    name: z.string().min(2).max(120).optional(),
    engine: z.nativeEnum(TestEngine).optional(),
    templateKey: z.string().max(100).nullable().optional(),
    enabled: z.boolean().optional(),
    config: TestConfigSchema.nullable().optional(),
    assertions: TestAssertionsSchema.nullable().optional(),
  })
  .strict();

export type UpdateTestDefinitionDtoSchema = z.infer<
  typeof UpdateTestDefinitionDto
>;

import { z } from 'zod';
import { TestDefinitionSource, TestEngine, TestType } from '@aba/database';
import { HTTP_METHODS } from '@/modules/test-page/dtos/CreateTestPageDto';

/** One simulated form field (the form simulator). All values serialise as
 *  strings; `type` is a UI hint (password/captcha/hidden/… render differently). */
export const FormFieldSchema = z
  .object({
    name: z.string().min(1),
    type: z
      .enum([
        'text',
        'password',
        'email',
        'number',
        'checkbox',
        'hidden',
        'captcha',
        'textarea',
        'select',
      ])
      .default('text'),
    value: z.string().optional(),
    /** Marks a field whose value is sensitive (masked in the UI/snapshots). */
    secret: z.boolean().optional(),
  })
  .strict();

/** A specific form on the page this test targets. */
export const SimulatedFormSchema = z
  .object({
    name: z.string().max(120).optional(),
    fields: z.array(FormFieldSchema).default([]),
  })
  .strict();

/** A single JSON-path assertion against the response body. */
export const JsonPathAssertionSchema = z
  .object({
    path: z.string().min(1),
    equals: z.unknown().optional(),
    exists: z.boolean().optional(),
    matches: z.string().optional(),
  })
  .strict();

/** What to assert about a response — used per-scenario and as a test-level
 *  default. `negative: true` flips the meaning for "must NOT be accessible". */
export const TestAssertionsSchema = z
  .object({
    status: z.union([z.number().int(), z.array(z.number().int())]).optional(),
    headers: z.record(z.string()).optional(),
    jsonPath: z.array(JsonPathAssertionSchema).optional(),
    bodyContains: z.array(z.string()).optional(),
    negative: z.boolean().optional(),
  })
  .strict();

/** How a scenario authenticates relative to the page's stored credential. */
export const ScenarioConditionEnum = z.enum([
  'VALID_TOKEN',
  'NO_TOKEN',
  'INVALID_TOKEN',
  'EXPIRED_TOKEN',
  'CUSTOM',
]);

/**
 * One row of the auth/scenario matrix: run the same request under this auth
 * condition and assert the expected response. The whole test executes once per
 * scenario, so a single test can prove "200 with token, 401 without".
 */
export const TestScenarioSchema = z
  .object({
    name: z.string().max(120).optional(),
    condition: ScenarioConditionEnum.default('VALID_TOKEN'),
    /** For EXPIRED_TOKEN / CUSTOM: a specific token value to send (e.g. a
     *  known-expired token the customer pasted). */
    tokenOverride: z.string().max(4000).optional(),
    /** For CUSTOM: extra/override headers for this scenario only. */
    headerOverrides: z.record(z.string()).optional(),
    expect: TestAssertionsSchema.default({}),
  })
  .strict();

/** Request shape the executor should send for a CUSTOM_API test. */
export const TestConfigSchema = z
  .object({
    method: z.enum(HTTP_METHODS).optional(),
    /** Overrides the page's path/url for this specific test. */
    pathOverride: z.string().max(2000).optional(),
    headers: z.record(z.string()).optional(),
    query: z.record(z.string()).optional(),
    /** How the body is encoded when a form is given. */
    contentType: z
      .enum(['json', 'form-urlencoded', 'multipart'])
      .optional(),
    /** The targeted form, simulated field-by-field. */
    form: SimulatedFormSchema.optional(),
    /** Raw body, used when no form is given. */
    body: z.unknown().optional(),
    /** Per-request timeout / expected token-validity window, in seconds. */
    timeoutSeconds: z.number().int().positive().max(600).optional(),
    /**
     * The auth/scenario matrix. When empty, the test runs once as an implicit
     * VALID_TOKEN scenario using the test-level `assertions`.
     */
    scenarios: z.array(TestScenarioSchema).optional(),
  })
  .strict();

export const CreateTestDefinitionDto = z
  .object({
    name: z.string().min(2).max(120),
    type: z.nativeEnum(TestType),
    /** Optional: defaults from type (CUSTOM_API→POSTMAN, else PLAYWRIGHT). */
    engine: z.nativeEnum(TestEngine).optional(),
    source: z.nativeEnum(TestDefinitionSource).default(TestDefinitionSource.MANUAL),
    /** Required for GLOBAL_SECURITY (identifies the template), else omitted. */
    templateKey: z.string().max(100).optional(),
    enabled: z.boolean().default(true),
    config: TestConfigSchema.optional(),
    assertions: TestAssertionsSchema.optional(),
  })
  .refine(
    (v) => v.type !== TestType.GLOBAL_SECURITY || Boolean(v.templateKey),
    {
      message: 'templateKey is required for GLOBAL_SECURITY definitions.',
      path: ['templateKey'],
    },
  );

export type CreateTestDefinitionDtoSchema = z.infer<
  typeof CreateTestDefinitionDto
>;

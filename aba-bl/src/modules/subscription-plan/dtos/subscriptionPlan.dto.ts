import { z } from 'zod';

export const CreateSubscriptionPlanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  maxServices: z.number().int().positive().nullable().optional(),
  maxEnvironments: z.number().int().positive().nullable().optional(),
  maxMonitoredBranches: z.number().int().positive().nullable().optional(),
  monthlyPrice: z.number().min(0, 'Monthly price must be >= 0'),
  yearlyPrice: z.number().min(0, 'Yearly price must be >= 0'),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),

  // ── E2E security-testing limits (null = unlimited / not offered) ──
  maxTestPages: z.number().int().positive().nullable().optional(),
  maxTestDefinitions: z.number().int().positive().nullable().optional(),
  maxTestRunsPerMonth: z.number().int().positive().nullable().optional(),
  allowScheduledTests: z.boolean().optional(),
  minTestScheduleIntervalHours: z.number().int().positive().nullable().optional(),
  allowWebhookTests: z.boolean().optional(),

  // ── AI assist (Phase B) ──
  // Tokens/month of Claude AI-assist included in the plan. null/0 = AI not
  // offered on this plan (every AI endpoint reports disabled for its companies).
  aiMonthlyTokenAllowance: z.number().int().min(0).nullable().optional(),
});

export type CreateSubscriptionPlanDto = z.infer<
  typeof CreateSubscriptionPlanSchema
>;

export const UpdateSubscriptionPlanSchema =
  CreateSubscriptionPlanSchema.partial();
export type UpdateSubscriptionPlanDto = z.infer<
  typeof UpdateSubscriptionPlanSchema
>;

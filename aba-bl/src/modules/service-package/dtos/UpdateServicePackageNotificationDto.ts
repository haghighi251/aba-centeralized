import { z } from 'zod';

export const UpdateServicePackageNotificationDto = z
  .discriminatedUnion('action', [
    z.object({ action: z.literal('MUTE') }),
    z.object({ action: z.literal('UNMUTE') }),
    z.object({ action: z.literal('SNOOZE'), until: z.coerce.date() }),
  ])
  .refine(
    (data) => data.action !== 'SNOOZE' || data.until.getTime() > Date.now(),
    {
      message: 'Snooze date must be in the future.',
      path: ['until'],
    },
  );

export type UpdateServicePackageNotificationDtoSchema = z.infer<
  typeof UpdateServicePackageNotificationDto
>;

import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const updateAvailabilitySchema = z.object({
  body: z.object({
    workingHours: z
      .array(
        z.object({
          dayOfWeek: z.number().int().min(0).max(6),
          startTime: z.string().regex(timeRegex, 'Use HH:MM'),
          endTime: z.string().regex(timeRegex, 'Use HH:MM'),
          enabled: z.boolean().default(true),
        })
      )
      .optional(),
    holidays: z.array(z.coerce.date()).optional(),
    blockedSlots: z
      .array(
        z.object({
          start: z.coerce.date(),
          end: z.coerce.date(),
          reason: z.string().max(200).optional(),
        })
      )
      .optional(),
    timezone: z.string().optional(),
  }),
});

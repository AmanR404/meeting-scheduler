import { z } from 'zod';
import { MeetingType, RecurrenceFrequency, MeetingStatus } from '../types/enums';

const recurrenceSchema = z
  .object({
    frequency: z.nativeEnum(RecurrenceFrequency),
    interval: z.number().int().positive().optional(),
    until: z.coerce.date().optional(),
    count: z.number().int().positive().max(52).optional(),
  })
  .optional();

export const createMeetingSchema = z.object({
  body: z
    .object({
      title: z.string().min(1).max(200),
      description: z.string().max(2000).optional(),
      notes: z.string().max(2000).optional(),
      type: z.nativeEnum(MeetingType),
      startTime: z.coerce.date(),
      endTime: z.coerce.date(),
      timezone: z.string().optional(),
      participantEmails: z.array(z.string().email()).min(1, 'At least one participant is required'),
      recurrence: recurrenceSchema,
    })
    .refine((d) => d.endTime > d.startTime, {
      message: 'endTime must be after startTime',
      path: ['endTime'],
    }),
});

export const rescheduleMeetingSchema = z.object({
  body: z
    .object({
      startTime: z.coerce.date(),
      endTime: z.coerce.date(),
    })
    .refine((d) => d.endTime > d.startTime, {
      message: 'endTime must be after startTime',
      path: ['endTime'],
    }),
  params: z.object({ id: z.string() }),
});

export const cancelMeetingSchema = z.object({
  body: z.object({ reason: z.string().max(500).optional() }),
  params: z.object({ id: z.string() }),
});

export const listMeetingsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(MeetingStatus).optional(),
    type: z.nativeEnum(MeetingType).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});

import { z } from 'zod';
import { AttendanceStatus } from '../types/enums';

export const updateAttendanceSchema = z.object({
  body: z.object({
    status: z.nativeEnum(AttendanceStatus).optional(),
    joinTime: z.coerce.date().optional(),
    leaveTime: z.coerce.date().optional(),
  }),
  params: z.object({ id: z.string() }),
});

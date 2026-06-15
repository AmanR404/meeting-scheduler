import { Types } from 'mongoose';
import { IUser } from '../models/User';
import { Meeting } from '../models/Meeting';
import { MeetingStatus } from '../types/enums';
import { Occurrence } from '../utils/recurrence';
import { getZonedParts, timeStringToMinutes, intervalsOverlap, isSameZonedDay } from '../utils/datetime';

export interface Conflict {
  startTime: Date;
  reason: string;
}

/** Check a single occurrence against the teacher's working hours. */
function violatesWorkingHours(teacher: IUser, occ: Occurrence): boolean {
  if (!teacher.workingHours || teacher.workingHours.length === 0) return false; // unconfigured = always available
  const tz = teacher.timezone || 'UTC';
  const startParts = getZonedParts(occ.startTime, tz);
  const endParts = getZonedParts(occ.endTime, tz);
  const rule = teacher.workingHours.find((w) => w.dayOfWeek === startParts.weekday && w.enabled);
  if (!rule) return true; // no working hours on this day
  const winStart = timeStringToMinutes(rule.startTime);
  const winEnd = timeStringToMinutes(rule.endTime);
  return startParts.minutesOfDay < winStart || endParts.minutesOfDay > winEnd;
}

function violatesHoliday(teacher: IUser, occ: Occurrence): boolean {
  const tz = teacher.timezone || 'UTC';
  return (teacher.holidays || []).some((h) => isSameZonedDay(new Date(h), occ.startTime, tz));
}

function violatesBlockedSlot(teacher: IUser, occ: Occurrence): boolean {
  return (teacher.blockedSlots || []).some((b) =>
    intervalsOverlap(occ.startTime, occ.endTime, new Date(b.start), new Date(b.end))
  );
}

/**
 * Returns all conflicts across the given occurrences:
 *  - outside working hours / on a non-working day
 *  - on a configured holiday
 *  - inside a blocked slot
 *  - overlapping an existing scheduled meeting (organizer or participant)
 */
export async function findConflicts(
  teacher: IUser,
  occurrences: Occurrence[],
  excludeMeetingId?: string
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];

  // Pre-load the teacher's existing scheduled meetings in the overall window
  const windowStart = occurrences[0].startTime;
  const windowEnd = occurrences[occurrences.length - 1].endTime;
  const query: Record<string, unknown> = {
    organizer: teacher._id,
    status: MeetingStatus.SCHEDULED,
    startTime: { $lt: windowEnd },
    endTime: { $gt: windowStart },
  };
  if (excludeMeetingId && Types.ObjectId.isValid(excludeMeetingId)) {
    query._id = { $ne: new Types.ObjectId(excludeMeetingId) };
    query.seriesId = { $ne: new Types.ObjectId(excludeMeetingId) };
  }
  const existing = await Meeting.find(query).select('startTime endTime title').lean();

  for (const occ of occurrences) {
    if (violatesHoliday(teacher, occ)) {
      conflicts.push({ startTime: occ.startTime, reason: 'Falls on a configured holiday' });
      continue;
    }
    if (violatesWorkingHours(teacher, occ)) {
      conflicts.push({ startTime: occ.startTime, reason: 'Outside configured working hours' });
      continue;
    }
    if (violatesBlockedSlot(teacher, occ)) {
      conflicts.push({ startTime: occ.startTime, reason: 'Overlaps a blocked time slot' });
      continue;
    }
    const overlap = existing.find((m) => intervalsOverlap(occ.startTime, occ.endTime, m.startTime, m.endTime));
    if (overlap) {
      conflicts.push({ startTime: occ.startTime, reason: `Overlaps existing meeting "${overlap.title}"` });
    }
  }
  return conflicts;
}

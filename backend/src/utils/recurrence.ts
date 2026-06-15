import { RecurrenceFrequency } from '../types/enums';
import { IRecurrence } from '../models/Meeting';

export interface Occurrence {
  startTime: Date;
  endTime: Date;
}

const MAX_OCCURRENCES = 52; // safety cap

/**
 * Expand a recurrence rule into concrete occurrences.
 * One-time meetings (frequency NONE) yield a single occurrence.
 */
export function expandRecurrence(start: Date, end: Date, recurrence: IRecurrence): Occurrence[] {
  const durationMs = end.getTime() - start.getTime();
  if (!recurrence || recurrence.frequency === RecurrenceFrequency.NONE) {
    return [{ startTime: new Date(start), endTime: new Date(end) }];
  }

  const interval = Math.max(1, recurrence.interval || 1);
  const limitByCount = recurrence.count && recurrence.count > 0 ? recurrence.count : undefined;
  const until = recurrence.until ? new Date(recurrence.until) : undefined;
  const hardLimit = Math.min(limitByCount ?? MAX_OCCURRENCES, MAX_OCCURRENCES);

  const occurrences: Occurrence[] = [];
  const cursor = new Date(start);

  while (occurrences.length < hardLimit) {
    if (until && cursor.getTime() > until.getTime()) break;
    occurrences.push({
      startTime: new Date(cursor),
      endTime: new Date(cursor.getTime() + durationMs),
    });
    advance(cursor, recurrence.frequency, interval);
  }
  return occurrences;
}

function advance(date: Date, freq: RecurrenceFrequency, interval: number): void {
  switch (freq) {
    case RecurrenceFrequency.DAILY:
      date.setDate(date.getDate() + interval);
      break;
    case RecurrenceFrequency.WEEKLY:
      date.setDate(date.getDate() + 7 * interval);
      break;
    case RecurrenceFrequency.MONTHLY:
      date.setMonth(date.getMonth() + interval);
      break;
    default:
      // NONE — push far ahead so the loop terminates
      date.setFullYear(date.getFullYear() + 100);
  }
}

/** Build an RRULE string for Google Calendar (used when creating a single recurring event). */
export function toGoogleRRule(recurrence: IRecurrence): string[] {
  if (!recurrence || recurrence.frequency === RecurrenceFrequency.NONE) return [];
  const freqMap: Record<string, string> = {
    [RecurrenceFrequency.DAILY]: 'DAILY',
    [RecurrenceFrequency.WEEKLY]: 'WEEKLY',
    [RecurrenceFrequency.MONTHLY]: 'MONTHLY',
  };
  const parts = [`FREQ=${freqMap[recurrence.frequency]}`, `INTERVAL=${Math.max(1, recurrence.interval || 1)}`];
  if (recurrence.count) parts.push(`COUNT=${recurrence.count}`);
  else if (recurrence.until) parts.push(`UNTIL=${recurrence.until.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
  return [`RRULE:${parts.join(';')}`];
}

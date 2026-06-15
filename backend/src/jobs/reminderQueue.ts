import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { logger } from '../config/logger';

export const REMINDER_QUEUE = 'reminders';

export interface ReminderJobData {
  meetingId: string;
  offsetKey: string; // '24h' | '1h' | '15m'
  offsetLabel: string; // human label
}

/** The three reminder offsets before a meeting's start time. */
export const REMINDER_OFFSETS: { key: string; label: string; ms: number }[] = [
  { key: '24h', label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { key: '1h', label: '1 hour', ms: 60 * 60 * 1000 },
  { key: '15m', label: '15 minutes', ms: 15 * 60 * 1000 },
];

function createQueue() {
  return new Queue<ReminderJobData>(REMINDER_QUEUE, { connection: redisConnection });
}
let queue: ReturnType<typeof createQueue> | null = null;

function getQueue() {
  if (!queue) queue = createQueue();
  return queue;
}

function jobId(meetingId: string, offsetKey: string): string {
  return `rem:${meetingId}:${offsetKey}`;
}

/**
 * Schedule the 24h/1h/15min reminders for a meeting. Offsets already in the past
 * are skipped. Safe to call when Redis is down (logs a warning, no throw).
 */
export async function scheduleReminders(meetingId: string, startTime: Date): Promise<void> {
  const now = Date.now();
  try {
    const q = getQueue();
    const scheduled: string[] = [];
    for (const offset of REMINDER_OFFSETS) {
      const delay = startTime.getTime() - offset.ms - now;
      if (delay <= 0) continue; // too late to schedule this reminder
      await q.add(
        'reminder',
        { meetingId, offsetKey: offset.key, offsetLabel: offset.label },
        {
          delay,
          jobId: jobId(meetingId, offset.key),
          removeOnComplete: true,
          removeOnFail: 100,
        }
      );
      scheduled.push(offset.label);
    }
    if (scheduled.length) {
      logger.info(`⏰ Scheduled ${scheduled.length} reminder(s) for meeting ${meetingId}: ${scheduled.join(', ')} before start`);
    } else {
      logger.info(`No future reminder offsets for meeting ${meetingId} (starts too soon)`);
    }
  } catch (err) {
    logger.warn('Could not schedule reminders (Redis unavailable?) — start Redis to enable reminders', err);
  }
}

/** Remove any pending reminders for a meeting (used on reschedule/cancel). */
export async function removeReminders(meetingId: string): Promise<void> {
  try {
    const q = getQueue();
    await Promise.allSettled(
      REMINDER_OFFSETS.map(async (offset) => {
        const job = await q.getJob(jobId(meetingId, offset.key));
        if (job) await job.remove();
      })
    );
  } catch (err) {
    logger.warn('Could not remove reminders (Redis unavailable?)', err);
  }
}

/** Reschedule reminders: remove old, schedule fresh for the new start time. */
export async function rescheduleReminders(meetingId: string, newStartTime: Date): Promise<void> {
  await removeReminders(meetingId);
  await scheduleReminders(meetingId, newStartTime);
}

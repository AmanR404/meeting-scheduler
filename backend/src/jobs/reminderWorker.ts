import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { logger } from '../config/logger';
import { REMINDER_QUEUE, ReminderJobData } from './reminderQueue';
import { Meeting } from '../models/Meeting';
import { Notification } from '../models/Notification';
import { IUser } from '../models/User';
import { sendEmail } from '../services/email.service';
import { reminderEmail } from '../utils/emailTemplates';
import { MeetingStatus, NotificationType, NotificationStatus } from '../types/enums';

/** Process a single reminder job: email all participants of the meeting. */
async function processReminder(job: Job<ReminderJobData>): Promise<void> {
  const { meetingId, offsetKey, offsetLabel } = job.data;
  const meeting = await Meeting.findById(meetingId)
    .populate<{ organizer: IUser }>('organizer', 'name email')
    .populate<{ participants: IUser[] }>('participants', 'name email');

  if (!meeting) return;
  if (meeting.status !== MeetingStatus.SCHEDULED) return; // cancelled/completed — skip

  const organizer = meeting.organizer as unknown as IUser;
  const participants = meeting.participants as unknown as IUser[];

  const data = {
    title: meeting.title,
    description: meeting.description,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    timezone: meeting.timezone,
    meetLink: meeting.meetLink,
    organizerName: organizer?.name ?? 'Organizer',
  };
  const { subject, html } = reminderEmail(data, offsetLabel);

  for (const p of participants) {
    const ok = await sendEmail({ to: p.email, subject, html });
    await Notification.create({
      recipient: p._id,
      meeting: meeting._id,
      type: NotificationType.REMINDER,
      status: ok ? NotificationStatus.SENT : NotificationStatus.FAILED,
      subject,
      reminderOffset: offsetKey,
      sentAt: ok ? new Date() : undefined,
    });
  }
  logger.info(`Sent ${offsetLabel} reminder for meeting ${meetingId} to ${participants.length} participant(s)`);
}

/** Start the in-process reminder worker. Returns the Worker (or null if it can't start). */
export function startReminderWorker(): Worker<ReminderJobData> | null {
  try {
    const worker = new Worker<ReminderJobData>(REMINDER_QUEUE, processReminder, {
      connection: redisConnection,
      concurrency: 5,
    });
    worker.on('failed', (job, err) => logger.error(`Reminder job ${job?.id} failed`, err));
    worker.on('error', (err) => logger.warn('Reminder worker error', err.message));
    logger.info('🔔 Reminder worker started');
    return worker;
  } catch (err) {
    logger.warn('Could not start reminder worker (Redis unavailable?)', err);
    return null;
  }
}

// Allow running as a standalone process: `npm run worker`
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { connectDatabase } = require('../config/database');
  void connectDatabase().then(() => startReminderWorker());
}

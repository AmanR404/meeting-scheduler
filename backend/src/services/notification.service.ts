import { IMeeting } from '../models/Meeting';
import { IUser } from '../models/User';
import { Notification } from '../models/Notification';
import { sendEmail } from './email.service';
import { invitationEmail, rescheduleEmail, cancellationEmail } from '../utils/emailTemplates';
import { NotificationType, NotificationStatus } from '../types/enums';
import { logger } from '../config/logger';

function buildData(meeting: IMeeting, organizerName: string) {
  return {
    title: meeting.title,
    description: meeting.description,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    timezone: meeting.timezone,
    meetLink: meeting.meetLink,
    organizerName,
  };
}

async function dispatch(
  meeting: IMeeting,
  participants: IUser[],
  type: NotificationType,
  subject: string,
  html: string
): Promise<void> {
  for (const p of participants) {
    let ok = false;
    try {
      ok = await sendEmail({ to: p.email, subject, html });
    } catch (err) {
      logger.warn(`Email dispatch failed for ${p.email}`, err);
    }
    await Notification.create({
      recipient: p._id,
      meeting: meeting._id,
      type,
      status: ok ? NotificationStatus.SENT : NotificationStatus.FAILED,
      subject,
      sentAt: ok ? new Date() : undefined,
    });
  }
}

export async function notifyInvitation(meeting: IMeeting, participants: IUser[], organizerName: string) {
  const { subject, html } = invitationEmail(buildData(meeting, organizerName));
  await dispatch(meeting, participants, NotificationType.INVITATION, subject, html);
}

export async function notifyReschedule(meeting: IMeeting, participants: IUser[], organizerName: string) {
  const { subject, html } = rescheduleEmail(buildData(meeting, organizerName));
  await dispatch(meeting, participants, NotificationType.RESCHEDULE, subject, html);
}

export async function notifyCancellation(
  meeting: IMeeting,
  participants: IUser[],
  organizerName: string,
  reason?: string
) {
  const { subject, html } = cancellationEmail(buildData(meeting, organizerName), reason);
  await dispatch(meeting, participants, NotificationType.CANCELLATION, subject, html);
}

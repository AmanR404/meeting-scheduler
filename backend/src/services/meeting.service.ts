import { Types } from 'mongoose';
import { Meeting, IMeeting } from '../models/Meeting';
import { User, IUser } from '../models/User';
import { resolveParticipantsByEmail } from './user.service';
import { findConflicts } from './availability.service';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from './calendar.service';
import { notifyInvitation, notifyReschedule, notifyCancellation } from './notification.service';
import { scheduleReminders, rescheduleReminders, removeReminders } from '../jobs/reminderQueue';
import { expandRecurrence } from '../utils/recurrence';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { MeetingType, MeetingStatus, RecurrenceFrequency } from '../types/enums';

export interface CreateMeetingDto {
  title: string;
  description?: string;
  notes?: string;
  type: MeetingType;
  startTime: Date;
  endTime: Date;
  timezone?: string;
  participantEmails: string[];
  recurrence?: {
    frequency: RecurrenceFrequency;
    interval?: number;
    until?: Date;
    count?: number;
  };
}

export interface CreateMeetingResult {
  meetings: IMeeting[];
}

/** Create one-time or recurring meetings, each with its own Google Calendar event + Meet link. */
export async function createMeetings(organizerId: string, dto: CreateMeetingDto): Promise<CreateMeetingResult> {
  const organizer = await User.findById(organizerId);
  if (!organizer) throw ApiError.notFound('Organizer not found');

  const timezone = dto.timezone || organizer.timezone || 'UTC';
  const participants = await resolveParticipantsByEmail(dto.participantEmails);
  const attendeeEmails = participants.map((p) => p.email);

  const recurrence = {
    frequency: dto.recurrence?.frequency ?? RecurrenceFrequency.NONE,
    interval: dto.recurrence?.interval ?? 1,
    until: dto.recurrence?.until,
    count: dto.recurrence?.count,
  };
  const occurrences = expandRecurrence(dto.startTime, dto.endTime, recurrence);

  // Conflict detection across all occurrences
  const conflicts = await findConflicts(organizer, occurrences);
  if (conflicts.length > 0) {
    throw new ApiError(409, 'Scheduling conflicts detected', conflicts);
  }

  const isRecurring = recurrence.frequency !== RecurrenceFrequency.NONE && occurrences.length > 1;
  const seriesId = isRecurring ? new Types.ObjectId() : undefined;

  const created: IMeeting[] = [];
  const createdEventIds: string[] = [];

  try {
    for (let i = 0; i < occurrences.length; i++) {
      const occ = occurrences[i];
      const event = await createCalendarEvent(organizerId, {
        title: dto.title,
        description: dto.description,
        startTime: occ.startTime,
        endTime: occ.endTime,
        timezone,
        attendeeEmails,
      });
      createdEventIds.push(event.eventId);

      const meeting = await Meeting.create({
        title: dto.title,
        description: dto.description,
        notes: dto.notes,
        type: dto.type,
        status: MeetingStatus.SCHEDULED,
        organizer: organizer._id,
        participants: participants.map((p) => p._id),
        startTime: occ.startTime,
        endTime: occ.endTime,
        timezone,
        recurrence,
        seriesId,
        isRecurringInstance: isRecurring && i > 0,
        googleEventId: event.eventId,
        googleCalendarId: event.calendarId,
        meetLink: event.meetLink,
      });
      created.push(meeting);

      // Send branded invitation emails + record notifications, then schedule reminders
      await notifyInvitation(meeting, participants, organizer.name);
      await scheduleReminders(meeting._id.toString(), meeting.startTime);
    }
  } catch (err) {
    // Roll back Google events + DB docs created so far
    logger.error('Meeting creation failed, rolling back', err);
    await Promise.allSettled(createdEventIds.map((id) => deleteCalendarEvent(organizerId, id)));
    await Meeting.deleteMany({ _id: { $in: created.map((m) => m._id) } });
    throw err instanceof ApiError ? err : ApiError.internal('Failed to create meetings');
  }

  return { meetings: created };
}

interface ListFilters {
  status?: MeetingStatus;
  type?: MeetingType;
  from?: Date;
  to?: Date;
}

/**
 * Transition scheduled meetings whose end time has passed to "completed".
 * Returns the newly-completed meetings (id + organizer) so callers can, e.g.,
 * trigger an attendance sync. Scoped optionally to one organizer/participant.
 */
export async function markDueMeetingsCompleted(
  scope: { organizerId?: string; participantId?: string } = {}
): Promise<{ id: string; organizer: string }[]> {
  const q: Record<string, unknown> = {
    status: MeetingStatus.SCHEDULED,
    endTime: { $lt: new Date() },
  };
  if (scope.organizerId) q.organizer = scope.organizerId;
  if (scope.participantId) q.participants = scope.participantId;

  const due = await Meeting.find(q).select('_id organizer').lean();
  if (due.length === 0) return [];
  await Meeting.updateMany(
    { _id: { $in: due.map((d) => d._id) } },
    { $set: { status: MeetingStatus.COMPLETED } }
  );
  return due.map((d) => ({ id: d._id.toString(), organizer: d.organizer.toString() }));
}

/** List meetings visible to the user (organizer sees own; candidate sees assigned). */
export async function listMeetings(user: { id: string; role: string }, filters: ListFilters) {
  // Keep statuses fresh before listing
  await markDueMeetingsCompleted(
    user.role === 'teacher' ? { organizerId: user.id } : { participantId: user.id }
  );

  const query: Record<string, unknown> = {};
  if (user.role === 'teacher') query.organizer = user.id;
  else query.participants = user.id;

  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.$gte = filters.from;
    if (filters.to) range.$lte = filters.to;
    query.startTime = range;
  }

  return Meeting.find(query)
    .populate('organizer', 'name email profileImage')
    .populate('participants', 'name email profileImage')
    .sort({ startTime: 1 });
}

/** Get a single meeting the user is allowed to see. */
export async function getMeetingForUser(user: { id: string; role: string }, meetingId: string) {
  if (!Types.ObjectId.isValid(meetingId)) throw ApiError.badRequest('Invalid meeting id');
  const meeting = await Meeting.findById(meetingId)
    .populate('organizer', 'name email profileImage')
    .populate('participants', 'name email profileImage');
  if (!meeting) throw ApiError.notFound('Meeting not found');

  const isOrganizer = meeting.organizer._id.toString() === user.id;
  const isParticipant = meeting.participants.some((p) => p._id.toString() === user.id);
  if (!isOrganizer && !isParticipant) throw ApiError.forbidden('You cannot access this meeting');

  // Auto-complete if the meeting has ended
  if (meeting.status === MeetingStatus.SCHEDULED && meeting.endTime.getTime() < Date.now()) {
    meeting.status = MeetingStatus.COMPLETED;
    await meeting.save();
  }
  return meeting;
}

/** Reschedule a meeting (organizer only). Re-checks conflicts and updates Google. */
export async function rescheduleMeeting(
  organizerId: string,
  meetingId: string,
  startTime: Date,
  endTime: Date
): Promise<IMeeting> {
  if (!Types.ObjectId.isValid(meetingId)) throw ApiError.badRequest('Invalid meeting id');
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw ApiError.notFound('Meeting not found');
  if (meeting.organizer.toString() !== organizerId) throw ApiError.forbidden('Only the organizer can reschedule');
  if (meeting.status === MeetingStatus.CANCELLED) throw ApiError.badRequest('Cannot reschedule a cancelled meeting');

  const organizer = await User.findById(organizerId);
  if (!organizer) throw ApiError.notFound('Organizer not found');

  const conflicts = await findConflicts(organizer, [{ startTime, endTime }], meetingId);
  if (conflicts.length > 0) throw new ApiError(409, 'Scheduling conflicts detected', conflicts);

  if (meeting.googleEventId) {
    await updateCalendarEvent(organizerId, meeting.googleEventId, { startTime, endTime, timezone: meeting.timezone });
  }

  meeting.startTime = startTime;
  meeting.endTime = endTime;
  await meeting.save();

  const participants = await User.find({ _id: { $in: meeting.participants } });
  await notifyReschedule(meeting, participants, organizer.name);
  await rescheduleReminders(meeting._id.toString(), startTime);
  return meeting;
}

/** Cancel a meeting (organizer only). Removes the Google event and notifies attendees. */
export async function cancelMeeting(organizerId: string, meetingId: string, reason?: string): Promise<IMeeting> {
  if (!Types.ObjectId.isValid(meetingId)) throw ApiError.badRequest('Invalid meeting id');
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw ApiError.notFound('Meeting not found');
  if (meeting.organizer.toString() !== organizerId) throw ApiError.forbidden('Only the organizer can cancel');
  if (meeting.status === MeetingStatus.CANCELLED) return meeting;

  if (meeting.googleEventId) {
    await deleteCalendarEvent(organizerId, meeting.googleEventId);
  }
  meeting.status = MeetingStatus.CANCELLED;
  meeting.cancelledAt = new Date();
  meeting.cancelReason = reason;
  await meeting.save();

  await removeReminders(meeting._id.toString());
  const organizer = await User.findById(organizerId);
  const participants = await User.find({ _id: { $in: meeting.participants } });
  await notifyCancellation(meeting, participants, organizer?.name ?? 'Organizer', reason);
  return meeting;
}

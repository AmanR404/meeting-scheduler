import crypto from 'crypto';
import { calendar, calendar_v3 } from '@googleapis/calendar';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { createOAuthClient } from './google.service';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';

export interface CalendarEventInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  attendeeEmails: string[];
  recurrence?: string[]; // RRULE lines (optional)
}

export interface CalendarEventResult {
  eventId: string;
  meetLink: string;
  htmlLink: string;
  calendarId: string;
}

/**
 * Build an authorized Calendar client for a user from their stored Google tokens.
 * Refreshed access tokens are persisted back to the user automatically.
 */
async function getCalendarClientForUser(userId: string): Promise<calendar_v3.Calendar> {
  const user = await User.findById(userId).select(
    '+googleAccessToken +googleRefreshToken +googleTokenExpiry'
  );
  if (!user) throw ApiError.notFound('Organizer not found');
  if (!user.googleRefreshToken && !user.googleAccessToken) {
    throw ApiError.badRequest('Google account not connected. Please log in with Google again.');
  }

  const client: OAuth2Client = createOAuthClient();
  client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpiry ? user.googleTokenExpiry.getTime() : undefined,
  });

  // Persist refreshed tokens
  client.on('tokens', (tokens) => {
    void (async () => {
      try {
        const update: Record<string, unknown> = {};
        if (tokens.access_token) update.googleAccessToken = tokens.access_token;
        if (tokens.refresh_token) update.googleRefreshToken = tokens.refresh_token;
        if (tokens.expiry_date) update.googleTokenExpiry = new Date(tokens.expiry_date);
        if (Object.keys(update).length) await User.findByIdAndUpdate(userId, update);
      } catch (err) {
        logger.warn('Failed to persist refreshed Google tokens', err);
      }
    })();
  });

  return calendar({ version: 'v3', auth: client });
}

function extractMeetLink(event: calendar_v3.Schema$Event): string {
  if (event.hangoutLink) return event.hangoutLink;
  const entry = event.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video');
  return entry?.uri ?? '';
}

/** Create a Google Calendar event with an auto-generated Google Meet link. */
export async function createCalendarEvent(
  organizerId: string,
  input: CalendarEventInput
): Promise<CalendarEventResult> {
  const cal = await getCalendarClientForUser(organizerId);
  const requestId = crypto.randomUUID();

  const requestBody: calendar_v3.Schema$Event = {
    summary: input.title,
    description: input.description,
    start: { dateTime: input.startTime.toISOString(), timeZone: input.timezone },
    end: { dateTime: input.endTime.toISOString(), timeZone: input.timezone },
    attendees: input.attendeeEmails.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
    reminders: { useDefault: true },
  };
  if (input.recurrence && input.recurrence.length) {
    requestBody.recurrence = input.recurrence;
  }

  try {
    const res = await cal.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1,
      sendUpdates: 'all', // Google emails invitations and adds the event to attendee calendars
      requestBody,
    });
    const event = res.data;
    if (!event.id) throw ApiError.internal('Google did not return an event id');
    return {
      eventId: event.id,
      meetLink: extractMeetLink(event),
      htmlLink: event.htmlLink ?? '',
      calendarId: 'primary',
    };
  } catch (err) {
    logger.error('Google Calendar event creation failed', err);
    throw ApiError.internal('Failed to create Google Calendar event');
  }
}

/** Update an existing Google Calendar event (time/title/attendees). */
export async function updateCalendarEvent(
  organizerId: string,
  eventId: string,
  input: Partial<CalendarEventInput>
): Promise<void> {
  const cal = await getCalendarClientForUser(organizerId);
  const requestBody: calendar_v3.Schema$Event = {};
  if (input.title !== undefined) requestBody.summary = input.title;
  if (input.description !== undefined) requestBody.description = input.description;
  if (input.startTime && input.timezone)
    requestBody.start = { dateTime: input.startTime.toISOString(), timeZone: input.timezone };
  if (input.endTime && input.timezone)
    requestBody.end = { dateTime: input.endTime.toISOString(), timeZone: input.timezone };
  if (input.attendeeEmails) requestBody.attendees = input.attendeeEmails.map((email) => ({ email }));

  try {
    await cal.events.patch({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
      requestBody,
    });
  } catch (err) {
    logger.error('Google Calendar event update failed', err);
    throw ApiError.internal('Failed to update Google Calendar event');
  }
}

/** Delete a Google Calendar event and notify attendees. */
export async function deleteCalendarEvent(organizerId: string, eventId: string): Promise<void> {
  const cal = await getCalendarClientForUser(organizerId);
  try {
    await cal.events.delete({ calendarId: 'primary', eventId, sendUpdates: 'all' });
  } catch (err) {
    // Already-deleted events return 410; treat as success
    logger.warn('Google Calendar event delete returned an error (may already be gone)', err);
  }
}

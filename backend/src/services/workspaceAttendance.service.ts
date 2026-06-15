import path from 'path';
import fs from 'fs';
import { JWT } from 'google-auth-library';
import { admin, admin_reports_v1 } from '@googleapis/admin';
import { Types } from 'mongoose';
import { Meeting, IMeeting } from '../models/Meeting';
import { Attendance } from '../models/Attendance';
import { IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { env } from '../config/env';
import { computeAttendance } from '../utils/attendanceStatus';
import { AttendanceStatus } from '../types/enums';

const REPORTS_SCOPE = 'https://www.googleapis.com/auth/admin.reports.audit.readonly';

function buildReportsClient(): admin_reports_v1.Admin {
  const keyPath = path.resolve(process.cwd(), env.google.serviceAccountPath);
  if (!fs.existsSync(keyPath)) {
    throw ApiError.badRequest(
      'Workspace attendance unavailable: service account JSON not found. Use app-based attendance instead.'
    );
  }
  if (!env.google.workspaceAdminEmail) {
    throw ApiError.badRequest('Workspace attendance unavailable: GOOGLE_WORKSPACE_ADMIN_EMAIL not set.');
  }
  const key = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
  const auth = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: [REPORTS_SCOPE],
    subject: env.google.workspaceAdminEmail, // domain-wide delegation impersonation
  });
  return admin({ version: 'reports_v1', auth });
}

interface ReportEvent {
  parameters?: Array<{ name?: string | null; value?: string | null; intValue?: string | null }> | null;
}

function param(event: ReportEvent, name: string): string | undefined {
  const p = event.parameters?.find((x) => x.name === name);
  return p?.value ?? (p?.intValue != null ? String(p.intValue) : undefined);
}

interface ParsedSession {
  email: string;
  join: Date;
  leave: Date;
  durationSeconds: number;
}

/** Extract the Meet meeting code from a Meet link, normalized (no dashes). */
function meetCodeFromLink(meetLink?: string): string | undefined {
  if (!meetLink) return undefined;
  const m = meetLink.match(/meet\.google\.com\/([a-z-]+)/i);
  return m?.[1]?.replace(/-/g, '').toLowerCase();
}

/**
 * Sync attendance for a meeting from the Google Workspace Admin Reports API
 * (Meet audit log, `call_ended` events). Matches participants by email and the
 * meeting code / organizer. Requires a Workspace account + domain-wide delegation.
 */
export async function syncWorkspaceAttendance(teacherId: string, meetingId: string): Promise<number> {
  if (!Types.ObjectId.isValid(meetingId)) throw ApiError.badRequest('Invalid meeting id');
  const meeting = await Meeting.findById(meetingId).populate<{ participants: IUser[] }>(
    'participants',
    'name email'
  );
  if (!meeting) throw ApiError.notFound('Meeting not found');
  if (meeting.organizer.toString() !== teacherId) throw ApiError.forbidden('Only the organizer can sync attendance');

  const reports = buildReportsClient();
  const targetCode = meetCodeFromLink(meeting.meetLink);

  // Query a window around the meeting (Meet events can land slightly after the end)
  const startTime = new Date(meeting.startTime.getTime() - 15 * 60000).toISOString();
  const endTime = new Date(meeting.endTime.getTime() + 6 * 60 * 60000).toISOString();

  let items: admin_reports_v1.Schema$Activity[] = [];
  try {
    const res = await reports.activities.list({
      userKey: 'all',
      applicationName: 'meet',
      eventName: 'call_ended',
      startTime,
      endTime,
      maxResults: 1000,
    });
    items = res.data.items ?? [];
  } catch (err) {
    logger.error('Workspace Reports API query failed', err);
    throw ApiError.internal('Failed to query Google Workspace attendance reports');
  }

  // Collect per-email sessions that belong to this meeting
  const sessions = new Map<string, ParsedSession[]>();
  for (const item of items) {
    const leave = item.id?.time ? new Date(item.id.time) : undefined;
    for (const event of item.events ?? []) {
      const code = param(event, 'meeting_code')?.replace(/-/g, '').toLowerCase();
      // If we know the meeting code, require a match; otherwise rely on the time window.
      const belongs = targetCode ? code === targetCode : true;
      if (!belongs) continue;

      const email = param(event, 'identifier')?.toLowerCase();
      const durationSeconds = parseInt(param(event, 'duration_seconds') ?? '0', 10);
      if (!email || !leave) continue;
      const join = new Date(leave.getTime() - durationSeconds * 1000);
      const arr = sessions.get(email) ?? [];
      arr.push({ email, join, leave, durationSeconds });
      sessions.set(email, arr);
    }
  }

  // Apply to participants
  const participants = meeting.participants as unknown as IUser[];
  let updated = 0;
  for (const p of participants) {
    const ps = sessions.get(p.email.toLowerCase());
    if (!ps || ps.length === 0) continue;
    const join = new Date(Math.min(...ps.map((s) => s.join.getTime())));
    const leave = new Date(Math.max(...ps.map((s) => s.leave.getTime())));
    const { status, durationMinutes } = computeAttendance(meeting.startTime, meeting.endTime, join, leave, {
      lateGraceMinutes: env.attendance.lateGraceMinutes,
      earlyLeaveMinutes: env.attendance.earlyLeaveMinutes,
    });
    await Attendance.findOneAndUpdate(
      { meeting: meeting._id, participant: p._id },
      { joinTime: join, leaveTime: leave, durationMinutes, status, source: 'workspace' },
      { upsert: true, new: true }
    );
    updated++;
  }

  // Mark non-attendees absent (only if no record exists)
  for (const p of participants) {
    if (sessions.has(p.email.toLowerCase())) continue;
    await Attendance.findOneAndUpdate(
      { meeting: meeting._id, participant: p._id },
      { $setOnInsert: { status: AttendanceStatus.ABSENT, durationMinutes: 0, source: 'workspace' } },
      { upsert: true }
    );
  }

  return updated;
}

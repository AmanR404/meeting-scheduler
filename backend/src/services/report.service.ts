import { Types } from 'mongoose';
import { Meeting } from '../models/Meeting';
import { Attendance } from '../models/Attendance';
import { ApiError } from '../utils/ApiError';
import { getMeetingAttendance, MeetingAttendanceRow } from './attendance.service';
import { markDueMeetingsCompleted } from './meeting.service';
import { ATTENDED_STATUSES } from '../utils/attendanceStatus';
import { AttendanceStatus, MeetingStatus } from '../types/enums';

export interface MeetingReport {
  meeting: {
    id: string;
    title: string;
    type: string;
    startTime: Date;
    endTime: Date;
    timezone: string;
    status: string;
  };
  rows: MeetingAttendanceRow[];
  totalParticipants: number;
  presentCount: number;
  absentCount: number;
  attendancePct: number;
}

/** Per-meeting attendance report (teacher must own the meeting). */
export async function getMeetingReport(teacherId: string, meetingId: string): Promise<MeetingReport> {
  if (!Types.ObjectId.isValid(meetingId)) throw ApiError.badRequest('Invalid meeting id');
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw ApiError.notFound('Meeting not found');
  if (meeting.organizer.toString() !== teacherId) throw ApiError.forbidden('Only the organizer can view this report');

  const rows = await getMeetingAttendance(teacherId, meetingId);
  const total = rows.length;
  const present = rows.filter((r) => ATTENDED_STATUSES.includes(r.status)).length;
  const absent = total - present;

  return {
    meeting: {
      id: meeting._id.toString(),
      title: meeting.title,
      type: meeting.type,
      startTime: meeting.startTime,
      endTime: meeting.endTime,
      timezone: meeting.timezone,
      status: meeting.status,
    },
    rows,
    totalParticipants: total,
    presentCount: present,
    absentCount: absent,
    attendancePct: total ? Math.round((present / total) * 100) : 0,
  };
}

export interface TeacherSummary {
  range: { from?: Date; to?: Date };
  totalMeetings: number;
  upcomingMeetings: number;
  completedMeetings: number;
  cancelledMeetings: number;
  uniqueParticipants: number;
  participantSlots: number;
  attendedCount: number;
  attendanceRate: number; // %
  noShowRate: number; // %
  averageDurationMinutes: number;
  statusBreakdown: Record<AttendanceStatus, number>;
}

/** Aggregate analytics across a teacher's meetings (optionally within a date range). */
export async function getTeacherSummary(teacherId: string, from?: Date, to?: Date): Promise<TeacherSummary> {
  await markDueMeetingsCompleted({ organizerId: teacherId });
  const query: Record<string, unknown> = { organizer: teacherId };
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = from;
    if (to) range.$lte = to;
    query.startTime = range;
  }
  const meetings = await Meeting.find(query).select('participants startTime endTime status').lean();
  const now = Date.now();

  const cancelled = meetings.filter((m) => m.status === MeetingStatus.CANCELLED);
  const notCancelled = meetings.filter((m) => m.status !== MeetingStatus.CANCELLED);
  const past = notCancelled.filter((m) => new Date(m.endTime).getTime() < now);
  const upcoming = notCancelled.filter((m) => new Date(m.startTime).getTime() > now);

  const pastIds = past.map((m) => m._id);
  const participantSlots = past.reduce((sum, m) => sum + (m.participants?.length ?? 0), 0);

  const records = await Attendance.find({ meeting: { $in: pastIds } }).lean();
  const statusBreakdown: Record<AttendanceStatus, number> = {
    [AttendanceStatus.PRESENT]: 0,
    [AttendanceStatus.LATE]: 0,
    [AttendanceStatus.LEFT_EARLY]: 0,
    [AttendanceStatus.ABSENT]: 0,
  };
  let attended = 0;
  let durationSum = 0;
  let durationCount = 0;
  for (const r of records) {
    statusBreakdown[r.status as AttendanceStatus]++;
    if (ATTENDED_STATUSES.includes(r.status as AttendanceStatus)) {
      attended++;
      durationSum += r.durationMinutes ?? 0;
      durationCount++;
    }
  }

  const uniqueParticipants = new Set(
    meetings.flatMap((m) => (m.participants ?? []).map((p) => p.toString()))
  ).size;

  const attendanceRate = participantSlots ? Math.round((attended / participantSlots) * 100) : 0;

  return {
    range: { from, to },
    totalMeetings: meetings.length,
    upcomingMeetings: upcoming.length,
    completedMeetings: past.length,
    cancelledMeetings: cancelled.length,
    uniqueParticipants,
    participantSlots,
    attendedCount: attended,
    attendanceRate,
    noShowRate: participantSlots ? 100 - attendanceRate : 0,
    averageDurationMinutes: durationCount ? Math.round(durationSum / durationCount) : 0,
    statusBreakdown,
  };
}

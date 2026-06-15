import { Types } from 'mongoose';
import { Attendance, IAttendance } from '../models/Attendance';
import { Meeting, IMeeting } from '../models/Meeting';
import { IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { computeAttendance } from '../utils/attendanceStatus';
import { env } from '../config/env';
import { AttendanceStatus } from '../types/enums';

const thresholds = {
  lateGraceMinutes: env.attendance.lateGraceMinutes,
  earlyLeaveMinutes: env.attendance.earlyLeaveMinutes,
};

async function loadMeetingForParticipant(meetingId: string, userId: string): Promise<IMeeting> {
  if (!Types.ObjectId.isValid(meetingId)) throw ApiError.badRequest('Invalid meeting id');
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw ApiError.notFound('Meeting not found');
  const isParticipant = meeting.participants.some((p) => p.toString() === userId);
  if (!isParticipant) throw ApiError.forbidden('You are not a participant in this meeting');
  return meeting;
}

/** Record (or confirm) a participant joining — sets joinTime once, returns the Meet link. */
export async function recordJoin(meetingId: string, userId: string): Promise<{ attendance: IAttendance; meetLink?: string }> {
  const meeting = await loadMeetingForParticipant(meetingId, userId);
  const now = new Date();

  let attendance = await Attendance.findOne({ meeting: meeting._id, participant: userId });
  if (!attendance) {
    attendance = new Attendance({ meeting: meeting._id, participant: userId, source: 'app' });
  }
  if (!attendance.joinTime) attendance.joinTime = now;
  attendance.leaveTime = now; // will advance via heartbeats
  const { status, durationMinutes } = computeAttendance(
    meeting.startTime,
    meeting.endTime,
    attendance.joinTime,
    attendance.leaveTime,
    thresholds
  );
  attendance.status = status;
  attendance.durationMinutes = durationMinutes;
  await attendance.save();
  return { attendance, meetLink: meeting.meetLink };
}

/** Heartbeat / leave — advances leaveTime to now and recomputes status + duration. */
export async function recordHeartbeat(meetingId: string, userId: string): Promise<IAttendance> {
  const meeting = await loadMeetingForParticipant(meetingId, userId);
  const attendance = await Attendance.findOne({ meeting: meeting._id, participant: userId });
  if (!attendance || !attendance.joinTime) {
    throw ApiError.badRequest('You must join the meeting before sending a heartbeat');
  }
  attendance.leaveTime = new Date();
  const { status, durationMinutes } = computeAttendance(
    meeting.startTime,
    meeting.endTime,
    attendance.joinTime,
    attendance.leaveTime,
    thresholds
  );
  attendance.status = status;
  attendance.durationMinutes = durationMinutes;
  await attendance.save();
  return attendance;
}

interface ManualUpdate {
  status?: AttendanceStatus;
  joinTime?: Date;
  leaveTime?: Date;
}

/** Teacher manual override of an attendance record. */
export async function manualUpdate(
  teacherId: string,
  attendanceId: string,
  update: ManualUpdate
): Promise<IAttendance> {
  if (!Types.ObjectId.isValid(attendanceId)) throw ApiError.badRequest('Invalid attendance id');
  const attendance = await Attendance.findById(attendanceId);
  if (!attendance) throw ApiError.notFound('Attendance record not found');
  const meeting = await Meeting.findById(attendance.meeting);
  if (!meeting) throw ApiError.notFound('Meeting not found');
  if (meeting.organizer.toString() !== teacherId) throw ApiError.forbidden('Only the organizer can edit attendance');

  if (update.joinTime !== undefined) attendance.joinTime = update.joinTime;
  if (update.leaveTime !== undefined) attendance.leaveTime = update.leaveTime;
  attendance.source = 'manual';

  if (update.status) {
    attendance.status = update.status;
    if (attendance.joinTime && attendance.leaveTime) {
      attendance.durationMinutes = Math.max(
        0,
        Math.round((attendance.leaveTime.getTime() - attendance.joinTime.getTime()) / 60000)
      );
    }
  } else {
    const { status, durationMinutes } = computeAttendance(
      meeting.startTime,
      meeting.endTime,
      attendance.joinTime,
      attendance.leaveTime,
      thresholds
    );
    attendance.status = status;
    attendance.durationMinutes = durationMinutes;
  }
  await attendance.save();
  return attendance;
}

export interface MeetingAttendanceRow {
  attendanceId?: string;
  participantId: string;
  name: string;
  email: string;
  joinTime?: Date;
  leaveTime?: Date;
  durationMinutes: number;
  status: AttendanceStatus;
  source?: string;
}

/**
 * Full attendance for a meeting — every participant, with an ABSENT default for
 * those who have no record yet. Teacher must own the meeting.
 */
export async function getMeetingAttendance(teacherId: string, meetingId: string): Promise<MeetingAttendanceRow[]> {
  if (!Types.ObjectId.isValid(meetingId)) throw ApiError.badRequest('Invalid meeting id');
  const meeting = await Meeting.findById(meetingId).populate<{ participants: IUser[] }>(
    'participants',
    'name email'
  );
  if (!meeting) throw ApiError.notFound('Meeting not found');
  if (meeting.organizer.toString() !== teacherId) throw ApiError.forbidden('Only the organizer can view attendance');

  const records = await Attendance.find({ meeting: meeting._id });
  const byParticipant = new Map(records.map((r) => [r.participant.toString(), r]));
  const participants = meeting.participants as unknown as IUser[];

  return participants.map((p) => {
    const rec = byParticipant.get(p._id.toString());
    return {
      attendanceId: rec?._id.toString(),
      participantId: p._id.toString(),
      name: p.name,
      email: p.email,
      joinTime: rec?.joinTime,
      leaveTime: rec?.leaveTime,
      durationMinutes: rec?.durationMinutes ?? 0,
      status: rec?.status ?? AttendanceStatus.ABSENT,
      source: rec?.source,
    };
  });
}

/** A user's own attendance history with meeting context. */
export async function getMyAttendance(userId: string) {
  const records = await Attendance.find({ participant: userId })
    .populate('meeting', 'title type startTime endTime status meetLink')
    .sort({ createdAt: -1 });
  return records;
}

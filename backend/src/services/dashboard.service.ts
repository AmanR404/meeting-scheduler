import { Meeting } from '../models/Meeting';
import { Attendance } from '../models/Attendance';
import { User } from '../models/User';
import { getTeacherSummary } from './report.service';
import { isSameZonedDay } from '../utils/datetime';
import { ATTENDED_STATUSES } from '../utils/attendanceStatus';
import { AttendanceStatus, MeetingStatus } from '../types/enums';

const DAY = 24 * 60 * 60 * 1000;

async function userTimezone(userId: string): Promise<string> {
  const u = await User.findById(userId).select('timezone').lean();
  return u?.timezone || 'UTC';
}

/** Teacher dashboard: counts, attendance %, today's + upcoming meetings, analytics. */
export async function getTeacherDashboard(teacherId: string) {
  const tz = await userTimezone(teacherId);
  const now = new Date();
  const summary = await getTeacherSummary(teacherId);

  const upcoming = await Meeting.find({
    organizer: teacherId,
    status: MeetingStatus.SCHEDULED,
    startTime: { $gt: now },
  })
    .sort({ startTime: 1 })
    .limit(5)
    .populate('participants', 'name email');

  const aroundToday = await Meeting.find({
    organizer: teacherId,
    status: MeetingStatus.SCHEDULED,
    startTime: { $gte: new Date(now.getTime() - DAY), $lte: new Date(now.getTime() + DAY) },
  }).sort({ startTime: 1 });
  const today = aroundToday.filter((m) => isSameZonedDay(m.startTime, now, tz));

  return {
    stats: {
      totalMeetings: summary.totalMeetings,
      upcomingMeetings: summary.upcomingMeetings,
      completedMeetings: summary.completedMeetings,
      cancelledMeetings: summary.cancelledMeetings,
      attendanceRate: summary.attendanceRate,
      noShowRate: summary.noShowRate,
      averageDurationMinutes: summary.averageDurationMinutes,
    },
    attendanceAnalytics: summary.statusBreakdown,
    todaysMeetings: today,
    upcomingMeetings: upcoming,
  };
}

/** Candidate dashboard: upcoming, today's, history count, personal attendance stats. */
export async function getCandidateDashboard(userId: string) {
  const tz = await userTimezone(userId);
  const now = new Date();

  const upcoming = await Meeting.find({
    participants: userId,
    status: MeetingStatus.SCHEDULED,
    startTime: { $gt: now },
  })
    .sort({ startTime: 1 })
    .limit(5)
    .populate('organizer', 'name email');

  const aroundToday = await Meeting.find({
    participants: userId,
    status: MeetingStatus.SCHEDULED,
    startTime: { $gte: new Date(now.getTime() - DAY), $lte: new Date(now.getTime() + DAY) },
  }).sort({ startTime: 1 });
  const today = aroundToday.filter((m) => isSameZonedDay(m.startTime, now, tz));

  const records = await Attendance.find({ participant: userId }).lean();
  const breakdown: Record<AttendanceStatus, number> = {
    [AttendanceStatus.PRESENT]: 0,
    [AttendanceStatus.LATE]: 0,
    [AttendanceStatus.LEFT_EARLY]: 0,
    [AttendanceStatus.ABSENT]: 0,
  };
  records.forEach((r) => breakdown[r.status as AttendanceStatus]++);
  const attended = records.filter((r) => ATTENDED_STATUSES.includes(r.status as AttendanceStatus)).length;

  const totalAssigned = await Meeting.countDocuments({ participants: userId, status: { $ne: MeetingStatus.CANCELLED } });

  return {
    stats: {
      totalMeetings: totalAssigned,
      upcomingMeetings: upcoming.length,
      attendedMeetings: attended,
      attendanceRate: records.length ? Math.round((attended / records.length) * 100) : 0,
    },
    attendanceRecordsBreakdown: breakdown,
    todaysMeetings: today,
    upcomingMeetings: upcoming,
  };
}

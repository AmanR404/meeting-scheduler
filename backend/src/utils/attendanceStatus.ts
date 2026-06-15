import { AttendanceStatus } from '../types/enums';

export interface AttendanceComputation {
  status: AttendanceStatus;
  durationMinutes: number;
}

export interface StatusThresholds {
  lateGraceMinutes: number;
  earlyLeaveMinutes: number;
}

/**
 * Derive attendance status and duration from join/leave timestamps relative to
 * the meeting window.
 *
 *  - No join          -> ABSENT
 *  - Joined late       -> LATE   (joined > start + grace)
 *  - Left early        -> LEFT_EARLY (left > earlyLeave before end), if not late
 *  - Otherwise         -> PRESENT
 */
export function computeAttendance(
  meetingStart: Date,
  meetingEnd: Date,
  joinTime: Date | undefined,
  leaveTime: Date | undefined,
  thresholds: StatusThresholds
): AttendanceComputation {
  if (!joinTime) {
    return { status: AttendanceStatus.ABSENT, durationMinutes: 0 };
  }

  const effectiveLeave = leaveTime ?? meetingEnd;
  const durationMs = Math.max(0, effectiveLeave.getTime() - joinTime.getTime());
  const durationMinutes = Math.round(durationMs / 60000);

  const lateThreshold = meetingStart.getTime() + thresholds.lateGraceMinutes * 60000;
  const earlyThreshold = meetingEnd.getTime() - thresholds.earlyLeaveMinutes * 60000;

  if (joinTime.getTime() > lateThreshold) {
    return { status: AttendanceStatus.LATE, durationMinutes };
  }
  if (leaveTime && leaveTime.getTime() < earlyThreshold) {
    return { status: AttendanceStatus.LEFT_EARLY, durationMinutes };
  }
  return { status: AttendanceStatus.PRESENT, durationMinutes };
}

/** Statuses that count as "attended" for attendance-rate calculations. */
export const ATTENDED_STATUSES = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.LEFT_EARLY,
];

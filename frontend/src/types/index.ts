export type UserRole = 'teacher' | 'candidate';

export type MeetingType =
  | 'interview'
  | 'technical_assessment'
  | 'training'
  | 'classroom'
  | 'mentorship'
  | 'mock_interview'
  | 'group_discussion';

export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled';
export type AttendanceStatus = 'present' | 'late' | 'left_early' | 'absent';
export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly';

export interface User {
  _id: string;
  name: string;
  email: string;
  profileImage?: string;
  role: UserRole;
  roleSelected?: boolean;
  timezone?: string;
  lastLoginAt?: string;
}

export interface Meeting {
  _id: string;
  title: string;
  description?: string;
  notes?: string;
  type: MeetingType;
  status: MeetingStatus;
  organizer: User | string;
  participants: User[] | string[];
  startTime: string;
  endTime: string;
  timezone: string;
  meetLink?: string;
  googleEventId?: string;
  recurrence?: { frequency: RecurrenceFrequency; interval: number };
  cancelReason?: string;
}

export interface AttendanceRow {
  attendanceId?: string;
  participantId: string;
  name: string;
  email: string;
  joinTime?: string;
  leaveTime?: string;
  durationMinutes: number;
  status: AttendanceStatus;
  source?: string;
}

export interface DashboardData {
  role: UserRole;
  stats: Record<string, number>;
  attendanceAnalytics?: Record<AttendanceStatus, number>;
  attendanceRecordsBreakdown?: Record<AttendanceStatus, number>;
  todaysMeetings: Meeting[];
  upcomingMeetings: Meeting[];
}

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
}

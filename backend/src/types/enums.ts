export enum UserRole {
  TEACHER = 'teacher',
  CANDIDATE = 'candidate',
}

export enum MeetingType {
  INTERVIEW = 'interview',
  TECHNICAL_ASSESSMENT = 'technical_assessment',
  TRAINING = 'training',
  CLASSROOM = 'classroom',
  MENTORSHIP = 'mentorship',
  MOCK_INTERVIEW = 'mock_interview',
  GROUP_DISCUSSION = 'group_discussion',
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum RecurrenceFrequency {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  LATE = 'late',
  LEFT_EARLY = 'left_early',
  ABSENT = 'absent',
}

export enum NotificationType {
  INVITATION = 'invitation',
  REMINDER = 'reminder',
  RESCHEDULE = 'reschedule',
  CANCELLATION = 'cancellation',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

export enum AuditAction {
  USER_LOGIN = 'user_login',
  MEETING_CREATE = 'meeting_create',
  MEETING_UPDATE = 'meeting_update',
  MEETING_CANCEL = 'meeting_cancel',
  ATTENDANCE_UPDATE = 'attendance_update',
  REPORT_DOWNLOAD = 'report_download',
}

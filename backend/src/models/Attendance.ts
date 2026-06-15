import { Schema, model, Document, Types } from 'mongoose';
import { AttendanceStatus } from '../types/enums';

export interface IAttendance extends Document {
  _id: Types.ObjectId;
  meeting: Types.ObjectId;
  participant: Types.ObjectId;
  joinTime?: Date;
  leaveTime?: Date;
  durationMinutes: number;
  status: AttendanceStatus;
  // 'workspace' = from Google Admin Reports API, 'app' = from in-app join/leave tracking, 'manual' = teacher override
  source: 'workspace' | 'app' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    meeting: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true, index: true },
    participant: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    joinTime: { type: Date },
    leaveTime: { type: Date },
    durationMinutes: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: Object.values(AttendanceStatus), default: AttendanceStatus.ABSENT, index: true },
    source: { type: String, enum: ['workspace', 'app', 'manual'], default: 'app' },
  },
  { timestamps: true }
);

// One attendance record per participant per meeting
attendanceSchema.index({ meeting: 1, participant: 1 }, { unique: true });

export const Attendance = model<IAttendance>('Attendance', attendanceSchema);

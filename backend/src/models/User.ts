import { Schema, model, Document, Types } from 'mongoose';
import { UserRole } from '../types/enums';

export interface IWorkingHours {
  // 0 = Sunday ... 6 = Saturday
  dayOfWeek: number;
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  enabled: boolean;
}

export interface IBlockedSlot {
  start: Date;
  end: Date;
  reason?: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  googleId: string;
  name: string;
  email: string;
  profileImage?: string;
  role: UserRole;
  // Google OAuth tokens (for calendar/meet on behalf of teacher)
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleTokenExpiry?: Date;
  // Availability (teachers)
  workingHours: IWorkingHours[];
  holidays: Date[];
  blockedSlots: IBlockedSlot[];
  timezone: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workingHoursSchema = new Schema<IWorkingHours>(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const blockedSlotSchema = new Schema<IBlockedSlot>(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    reason: { type: String },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    profileImage: { type: String },
    role: { type: String, enum: Object.values(UserRole), default: UserRole.CANDIDATE, index: true },
    googleAccessToken: { type: String, select: false },
    googleRefreshToken: { type: String, select: false },
    googleTokenExpiry: { type: Date, select: false },
    workingHours: { type: [workingHoursSchema], default: [] },
    holidays: { type: [Date], default: [] },
    blockedSlots: { type: [blockedSlotSchema], default: [] },
    timezone: { type: String, default: 'UTC' },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.googleAccessToken;
        delete ret.googleRefreshToken;
        delete ret.googleTokenExpiry;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const User = model<IUser>('User', userSchema);

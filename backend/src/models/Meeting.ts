import { Schema, model, Document, Types } from 'mongoose';
import { MeetingType, MeetingStatus, RecurrenceFrequency } from '../types/enums';

export interface IRecurrence {
  frequency: RecurrenceFrequency;
  interval: number; // every N days/weeks/months
  until?: Date; // recurrence end date
  count?: number; // or number of occurrences
}

export interface IMeeting extends Document {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  notes?: string;
  type: MeetingType;
  status: MeetingStatus;
  organizer: Types.ObjectId; // User (teacher)
  participants: Types.ObjectId[]; // Users (candidates)
  startTime: Date;
  endTime: Date;
  timezone: string;
  recurrence: IRecurrence;
  // Links recurring instances to a parent series
  seriesId?: Types.ObjectId;
  isRecurringInstance: boolean;
  // Google integration
  googleEventId?: string;
  googleCalendarId?: string;
  meetLink?: string;
  // Bookkeeping
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const recurrenceSchema = new Schema<IRecurrence>(
  {
    frequency: { type: String, enum: Object.values(RecurrenceFrequency), default: RecurrenceFrequency.NONE },
    interval: { type: Number, default: 1, min: 1 },
    until: { type: Date },
    count: { type: Number, min: 1 },
  },
  { _id: false }
);

const meetingSchema = new Schema<IMeeting>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    notes: { type: String, trim: true },
    type: { type: String, enum: Object.values(MeetingType), required: true },
    status: { type: String, enum: Object.values(MeetingStatus), default: MeetingStatus.SCHEDULED, index: true },
    organizer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },
    timezone: { type: String, default: 'UTC' },
    recurrence: { type: recurrenceSchema, default: () => ({ frequency: RecurrenceFrequency.NONE, interval: 1 }) },
    seriesId: { type: Schema.Types.ObjectId, ref: 'Meeting', index: true },
    isRecurringInstance: { type: Boolean, default: false },
    googleEventId: { type: String, index: true },
    googleCalendarId: { type: String },
    meetLink: { type: String },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
  },
  { timestamps: true }
);

// Common query patterns
meetingSchema.index({ organizer: 1, startTime: 1 });
meetingSchema.index({ participants: 1, startTime: 1 });
meetingSchema.index({ status: 1, startTime: 1 });

// Guard: end must be after start
meetingSchema.pre('validate', function (next) {
  if (this.endTime <= this.startTime) {
    next(new Error('endTime must be after startTime'));
  } else {
    next();
  }
});

export const Meeting = model<IMeeting>('Meeting', meetingSchema);

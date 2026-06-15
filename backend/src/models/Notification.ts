import { Schema, model, Document, Types } from 'mongoose';
import { NotificationType, NotificationStatus } from '../types/enums';

export interface INotification extends Document {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  meeting?: Types.ObjectId;
  type: NotificationType;
  status: NotificationStatus;
  channel: 'email';
  subject: string;
  // For reminders: which offset (e.g. '24h', '1h', '15m')
  reminderOffset?: string;
  scheduledFor?: Date;
  sentAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    meeting: { type: Schema.Types.ObjectId, ref: 'Meeting', index: true },
    type: { type: String, enum: Object.values(NotificationType), required: true },
    status: { type: String, enum: Object.values(NotificationStatus), default: NotificationStatus.PENDING, index: true },
    channel: { type: String, default: 'email' },
    subject: { type: String, required: true },
    reminderOffset: { type: String },
    scheduledFor: { type: Date },
    sentAt: { type: Date },
    error: { type: String },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = model<INotification>('Notification', notificationSchema);

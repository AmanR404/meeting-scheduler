import { Schema, model, Document, Types } from 'mongoose';
import { AuditAction } from '../types/enums';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actor: Types.ObjectId; // User who performed the action
  action: AuditAction;
  targetType?: string; // e.g. 'Meeting', 'Attendance'
  targetId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: Object.values(AuditAction), required: true, index: true },
    targetType: { type: String },
    targetId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', auditLogSchema);

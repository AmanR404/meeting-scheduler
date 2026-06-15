import { Request } from 'express';
import { AuditLog } from '../models/AuditLog';
import { AuditAction } from '../types/enums';
import { logger } from '../config/logger';

interface AuditParams {
  actorId: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}

/**
 * Records an audit log entry. Never throws — auditing must not break the
 * primary request flow.
 */
export async function recordAudit(params: AuditParams): Promise<void> {
  try {
    await AuditLog.create({
      actor: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata,
      ipAddress: params.req?.ip,
      userAgent: params.req?.get('user-agent'),
    });
  } catch (err) {
    logger.warn('Failed to record audit log', err);
  }
}

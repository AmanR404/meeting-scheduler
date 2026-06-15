import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import {
  recordJoin,
  recordHeartbeat,
  manualUpdate,
  getMeetingAttendance,
  getMyAttendance,
} from '../services/attendance.service';
import { syncWorkspaceAttendance } from '../services/workspaceAttendance.service';
import { recordAudit } from '../services/audit.service';
import { AuditAction } from '../types/enums';

/** POST /api/attendance/:meetingId/join */
export const join = asyncHandler(async (req: Request, res: Response) => {
  const result = await recordJoin(req.params.meetingId, req.user!.id);
  sendSuccess(res, 200, result, { message: 'Join recorded' });
});

/** POST /api/attendance/:meetingId/heartbeat */
export const heartbeat = asyncHandler(async (req: Request, res: Response) => {
  const attendance = await recordHeartbeat(req.params.meetingId, req.user!.id);
  sendSuccess(res, 200, attendance);
});

/** GET /api/attendance/meeting/:meetingId (teacher) */
export const meetingAttendance = asyncHandler(async (req: Request, res: Response) => {
  const rows = await getMeetingAttendance(req.user!.id, req.params.meetingId);
  sendSuccess(res, 200, rows, { meta: { count: rows.length } });
});

/** GET /api/attendance/me */
export const myAttendance = asyncHandler(async (req: Request, res: Response) => {
  const records = await getMyAttendance(req.user!.id);
  sendSuccess(res, 200, records);
});

/** PATCH /api/attendance/:id (teacher manual override) */
export const updateAttendance = asyncHandler(async (req: Request, res: Response) => {
  const attendance = await manualUpdate(req.user!.id, req.params.id, req.body);
  await recordAudit({
    actorId: req.user!.id,
    action: AuditAction.ATTENDANCE_UPDATE,
    targetType: 'Attendance',
    targetId: attendance._id.toString(),
    metadata: { manual: true },
    req,
  });
  sendSuccess(res, 200, attendance, { message: 'Attendance updated' });
});

/** POST /api/attendance/:meetingId/sync (teacher) — pull from Google Workspace Reports API */
export const sync = asyncHandler(async (req: Request, res: Response) => {
  const count = await syncWorkspaceAttendance(req.user!.id, req.params.meetingId);
  await recordAudit({
    actorId: req.user!.id,
    action: AuditAction.ATTENDANCE_UPDATE,
    targetType: 'Meeting',
    targetId: req.params.meetingId,
    metadata: { source: 'workspace', updated: count },
    req,
  });
  sendSuccess(res, 200, { updated: count }, { message: `Synced attendance for ${count} participant(s)` });
});

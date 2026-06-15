import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import {
  createMeetings,
  listMeetings,
  getMeetingForUser,
  rescheduleMeeting,
  cancelMeeting,
} from '../services/meeting.service';
import { listCandidates } from '../services/user.service';
import { recordAudit } from '../services/audit.service';
import { AuditAction, MeetingStatus, MeetingType } from '../types/enums';

/** POST /api/meetings — create a one-time or recurring meeting (teacher). */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const { meetings } = await createMeetings(user.id, req.body);
  await recordAudit({
    actorId: user.id,
    action: AuditAction.MEETING_CREATE,
    targetType: 'Meeting',
    targetId: meetings[0]?._id.toString(),
    metadata: { count: meetings.length, title: req.body.title },
    req,
  });
  sendSuccess(res, 201, meetings, { message: `Created ${meetings.length} meeting(s)` });
});

/** GET /api/meetings — list meetings for the current user. */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const meetings = await listMeetings(user, {
    status: req.query.status as MeetingStatus | undefined,
    type: req.query.type as MeetingType | undefined,
    from: req.query.from as unknown as Date | undefined,
    to: req.query.to as unknown as Date | undefined,
  });
  sendSuccess(res, 200, meetings, { meta: { count: meetings.length } });
});

/** GET /api/meetings/:id */
export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const meeting = await getMeetingForUser(req.user!, req.params.id);
  sendSuccess(res, 200, meeting);
});

/** PATCH /api/meetings/:id/reschedule (teacher). */
export const reschedule = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const meeting = await rescheduleMeeting(user.id, req.params.id, req.body.startTime, req.body.endTime);
  await recordAudit({
    actorId: user.id,
    action: AuditAction.MEETING_UPDATE,
    targetType: 'Meeting',
    targetId: meeting._id.toString(),
    metadata: { action: 'reschedule' },
    req,
  });
  sendSuccess(res, 200, meeting, { message: 'Meeting rescheduled' });
});

/** DELETE /api/meetings/:id — cancel (teacher). */
export const cancel = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const meeting = await cancelMeeting(user.id, req.params.id, req.body?.reason);
  await recordAudit({
    actorId: user.id,
    action: AuditAction.MEETING_CANCEL,
    targetType: 'Meeting',
    targetId: meeting._id.toString(),
    metadata: { reason: req.body?.reason },
    req,
  });
  sendSuccess(res, 200, meeting, { message: 'Meeting cancelled' });
});

/** GET /api/meetings/candidates — list candidates for the participant picker (teacher). */
export const candidates = asyncHandler(async (_req: Request, res: Response) => {
  const list = await listCandidates();
  sendSuccess(res, 200, list);
});

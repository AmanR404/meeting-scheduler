import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { UserRole } from '../types/enums';
import {
  join,
  heartbeat,
  meetingAttendance,
  myAttendance,
  updateAttendance,
  sync,
} from '../controllers/attendance.controller';
import { updateAttendanceSchema } from '../validators/attendance.validator';

const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /api/attendance/me:
 *   get:
 *     tags: [Attendance]
 *     summary: Get my attendance history
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Attendance records } }
 */
router.get('/me', myAttendance);

/**
 * @openapi
 * /api/attendance/meeting/{meetingId}:
 *   get:
 *     tags: [Attendance]
 *     summary: Get attendance for a meeting (teacher only)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema: { type: string }
 *     responses: { 200: { description: Attendance rows } }
 */
router.get('/meeting/:meetingId', requireRole(UserRole.TEACHER), meetingAttendance);

/**
 * @openapi
 * /api/attendance/{meetingId}/join:
 *   post:
 *     tags: [Attendance]
 *     summary: Record joining a meeting (returns the Meet link)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema: { type: string }
 *     responses: { 200: { description: Join recorded } }
 */
router.post('/:meetingId/join', join);

/**
 * @openapi
 * /api/attendance/{meetingId}/heartbeat:
 *   post:
 *     tags: [Attendance]
 *     summary: Heartbeat while in a meeting (advances leave time)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema: { type: string }
 *     responses: { 200: { description: Heartbeat recorded } }
 */
router.post('/:meetingId/heartbeat', heartbeat);

/**
 * @openapi
 * /api/attendance/{meetingId}/sync:
 *   post:
 *     tags: [Attendance]
 *     summary: Sync attendance from Google Workspace Reports API (teacher only)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema: { type: string }
 *     responses: { 200: { description: Synced } }
 */
router.post('/:meetingId/sync', requireRole(UserRole.TEACHER), sync);

/**
 * @openapi
 * /api/attendance/{id}:
 *   patch:
 *     tags: [Attendance]
 *     summary: Manually override an attendance record (teacher only)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses: { 200: { description: Updated } }
 */
router.patch('/:id', requireRole(UserRole.TEACHER), validate(updateAttendanceSchema), updateAttendance);

export default router;

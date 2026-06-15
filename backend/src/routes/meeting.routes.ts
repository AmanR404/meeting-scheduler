import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { UserRole } from '../types/enums';
import {
  create,
  list,
  getOne,
  reschedule,
  cancel,
  candidates,
} from '../controllers/meeting.controller';
import {
  createMeetingSchema,
  rescheduleMeetingSchema,
  cancelMeetingSchema,
  listMeetingsSchema,
} from '../validators/meeting.validator';

const router = Router();

// All meeting routes require authentication
router.use(authenticate);

/**
 * @openapi
 * /api/meetings:
 *   post:
 *     tags: [Meetings]
 *     summary: Create a one-time or recurring meeting (teacher only)
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, type, startTime, endTime, participantEmails]
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               notes: { type: string }
 *               type:
 *                 type: string
 *                 enum: [interview, technical_assessment, training, classroom, mentorship, mock_interview, group_discussion]
 *               startTime: { type: string, format: date-time }
 *               endTime: { type: string, format: date-time }
 *               timezone: { type: string }
 *               participantEmails:
 *                 type: array
 *                 items: { type: string, format: email }
 *               recurrence:
 *                 type: object
 *                 properties:
 *                   frequency: { type: string, enum: [none, daily, weekly, monthly] }
 *                   interval: { type: integer }
 *                   count: { type: integer }
 *                   until: { type: string, format: date-time }
 *     responses:
 *       201: { description: Meeting(s) created }
 *       409: { description: Scheduling conflict }
 *   get:
 *     tags: [Meetings]
 *     summary: List meetings for the current user
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [scheduled, completed, cancelled] }
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200: { description: List of meetings }
 */
router
  .route('/')
  .post(requireRole(UserRole.TEACHER), validate(createMeetingSchema), create)
  .get(validate(listMeetingsSchema), list);

/**
 * @openapi
 * /api/meetings/candidates:
 *   get:
 *     tags: [Meetings]
 *     summary: List candidate users for the participant picker (teacher only)
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: List of candidates }
 */
router.get('/candidates', requireRole(UserRole.TEACHER), candidates);

/**
 * @openapi
 * /api/meetings/{id}:
 *   get:
 *     tags: [Meetings]
 *     summary: Get a meeting by id
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Meeting }
 *       404: { description: Not found }
 *   delete:
 *     tags: [Meetings]
 *     summary: Cancel a meeting (teacher only)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Cancelled }
 */
router.get('/:id', getOne);
router.delete('/:id', requireRole(UserRole.TEACHER), validate(cancelMeetingSchema), cancel);

/**
 * @openapi
 * /api/meetings/{id}/reschedule:
 *   patch:
 *     tags: [Meetings]
 *     summary: Reschedule a meeting (teacher only)
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [startTime, endTime]
 *             properties:
 *               startTime: { type: string, format: date-time }
 *               endTime: { type: string, format: date-time }
 *     responses:
 *       200: { description: Rescheduled }
 *       409: { description: Scheduling conflict }
 */
router.patch('/:id/reschedule', requireRole(UserRole.TEACHER), validate(rescheduleMeetingSchema), reschedule);

export default router;

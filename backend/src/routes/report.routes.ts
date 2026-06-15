import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../types/enums';
import { meetingReport, summary } from '../controllers/report.controller';

const router = Router();
router.use(authenticate, requireRole(UserRole.TEACHER));

/**
 * @openapi
 * /api/reports/summary:
 *   get:
 *     tags: [Reports]
 *     summary: Attendance analytics summary (teacher). Supports json/pdf/xlsx export.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, pdf, xlsx] }
 *     responses: { 200: { description: Summary or file download } }
 */
router.get('/summary', summary);

/**
 * @openapi
 * /api/reports/meeting/{meetingId}:
 *   get:
 *     tags: [Reports]
 *     summary: Per-meeting attendance report (teacher). Supports json/pdf/xlsx export.
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: meetingId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: format
 *         schema: { type: string, enum: [json, pdf, xlsx] }
 *     responses: { 200: { description: Report or file download } }
 */
router.get('/meeting/:meetingId', meetingReport);

export default router;

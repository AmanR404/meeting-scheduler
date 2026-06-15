import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { dashboard } from '../controllers/dashboard.controller';

const router = Router();

/**
 * @openapi
 * /api/dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Role-aware dashboard data (teacher or candidate)
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Dashboard data } }
 */
router.get('/', authenticate, dashboard);

export default router;

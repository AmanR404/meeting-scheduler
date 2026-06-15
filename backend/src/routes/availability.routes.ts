import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { UserRole } from '../types/enums';
import { getAvailability, updateAvailability } from '../controllers/availability.controller';
import { updateAvailabilitySchema } from '../validators/availability.validator';

const router = Router();
router.use(authenticate, requireRole(UserRole.TEACHER));

/**
 * @openapi
 * /api/availability:
 *   get:
 *     tags: [Availability]
 *     summary: Get the teacher's availability (working hours, holidays, blocked slots)
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Availability } }
 *   put:
 *     tags: [Availability]
 *     summary: Update the teacher's availability
 *     security: [{ cookieAuth: [] }]
 *     responses: { 200: { description: Updated } }
 */
router.get('/', getAvailability);
router.put('/', validate(updateAvailabilitySchema), updateAvailability);

export default router;

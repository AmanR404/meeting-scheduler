import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import meetingRoutes from './meeting.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/meetings', meetingRoutes);

// Feature routes are mounted here in later phases:
// router.use('/attendance', attendanceRoutes);
// router.use('/reports', reportRoutes);
// router.use('/availability', availabilityRoutes);
// router.use('/notifications', notificationRoutes);

export default router;

import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();

router.use('/health', healthRoutes);

// Feature routes are mounted here in later phases:
// router.use('/auth', authRoutes);
// router.use('/meetings', meetingRoutes);
// router.use('/attendance', attendanceRoutes);
// router.use('/reports', reportRoutes);
// router.use('/availability', availabilityRoutes);
// router.use('/notifications', notificationRoutes);

export default router;

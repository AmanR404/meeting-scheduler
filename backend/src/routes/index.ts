import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import meetingRoutes from './meeting.routes';
import attendanceRoutes from './attendance.routes';
import reportRoutes from './report.routes';
import dashboardRoutes from './dashboard.routes';
import availabilityRoutes from './availability.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/meetings', meetingRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/availability', availabilityRoutes);

// Feature routes are mounted here in later phases:
// router.use('/attendance', attendanceRoutes);
// router.use('/reports', reportRoutes);
// router.use('/availability', availabilityRoutes);
// router.use('/notifications', notificationRoutes);

export default router;

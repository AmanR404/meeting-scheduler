import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Service health check
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/', (_req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    success: true,
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: dbStates[mongoose.connection.readyState] ?? 'unknown',
  });
});

export default router;

import { Router } from 'express';
import { googleLogin, googleCallback, getMe, logout } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @openapi
 * /api/auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Start Google OAuth login
 *     description: Redirects the browser to Google's consent screen.
 *     responses:
 *       302: { description: Redirect to Google }
 */
router.get('/google', authLimiter, googleLogin);

/**
 * @openapi
 * /api/auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Google OAuth callback
 *     description: Handles Google's redirect, creates/updates the user, sets a session cookie.
 *     parameters:
 *       - in: query
 *         name: code
 *         schema: { type: string }
 *       - in: query
 *         name: state
 *         schema: { type: string }
 *     responses:
 *       302: { description: Redirect to the frontend dashboard }
 */
router.get('/google/callback', authLimiter, googleCallback);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the current authenticated user
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 *       401: { description: Not authenticated }
 */
router.get('/me', authenticate, getMe);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out (clear session cookie)
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', logout);

export default router;

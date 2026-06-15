import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env';

/**
 * Build the OpenAPI spec from JSDoc annotations in the route files.
 * Reads both .ts (dev) and .js (compiled/Docker) so it works in every mode —
 * tsc keeps comments by default, so the @openapi blocks survive into dist.
 */
const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Teacher Meeting Scheduler & Attendance API',
      version: '1.0.0',
      description:
        'REST API for scheduling Google Meet meetings, managing calendars, tracking attendance, and reporting. ' +
        'Authentication uses Google OAuth 2.0; the session is a JWT stored in an httpOnly cookie.',
    },
    servers: [{ url: env.serverUrl, description: env.nodeEnv }],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: env.jwt.cookieName },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        ApiError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            details: { type: 'object' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['teacher', 'candidate'] },
            profileImage: { type: 'string' },
            timezone: { type: 'string' },
            lastLoginAt: { type: 'string', format: 'date-time' },
          },
        },
        Meeting: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            type: {
              type: 'string',
              enum: [
                'interview',
                'technical_assessment',
                'training',
                'classroom',
                'mentorship',
                'mock_interview',
                'group_discussion',
              ],
            },
            status: { type: 'string', enum: ['scheduled', 'completed', 'cancelled'] },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            meetLink: { type: 'string' },
            googleEventId: { type: 'string' },
          },
        },
        Attendance: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            meeting: { type: 'string' },
            participant: { type: 'string' },
            joinTime: { type: 'string', format: 'date-time' },
            leaveTime: { type: 'string', format: 'date-time' },
            durationMinutes: { type: 'number' },
            status: { type: 'string', enum: ['present', 'late', 'left_early', 'absent'] },
            source: { type: 'string', enum: ['workspace', 'app', 'manual'] },
          },
        },
      },
    },
    tags: [
      { name: 'Health' },
      { name: 'Auth' },
      { name: 'Meetings' },
      { name: 'Attendance' },
      { name: 'Reports' },
      { name: 'Dashboard' },
    ],
    security: [{ cookieAuth: [] }],
  },
  apis: [
    path.resolve(process.cwd(), 'src/routes/*.ts'),
    path.resolve(process.cwd(), 'dist/routes/*.js'),
  ],
};

export const openapiSpec = swaggerJSDoc(options) as Record<string, unknown>;

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Centralized, validated environment configuration.
 * Throws on startup if a required variable is missing so we fail fast.
 */
function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  isProd: optional('NODE_ENV', 'development') === 'production',
  port: parseInt(optional('PORT', '5000'), 10),
  clientUrl: optional('CLIENT_URL', 'http://localhost:3000'),
  serverUrl: optional('SERVER_URL', 'http://localhost:5000'),

  mongoUri: required('MONGODB_URI'),

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
    cookieName: optional('COOKIE_NAME', 'ms_token'),
  },

  google: {
    clientId: required('GOOGLE_CLIENT_ID'),
    clientSecret: required('GOOGLE_CLIENT_SECRET'),
    redirectUri: required('GOOGLE_OAUTH_REDIRECT_URI'),
    serviceAccountPath: optional('GOOGLE_SERVICE_ACCOUNT_PATH', './credentials/google-service-account.json'),
    workspaceAdminEmail: optional('GOOGLE_WORKSPACE_ADMIN_EMAIL'),
  },

  // Comma-separated emails that should be created as TEACHERS on first login.
  // Everyone else defaults to CANDIDATE. The workspace admin email is always a teacher.
  teacherEmails: optional('TEACHER_EMAILS')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),

  email: {
    provider: optional('EMAIL_PROVIDER', 'gmail'),
    user: optional('EMAIL_USER'),
    appPassword: optional('EMAIL_APP_PASSWORD'),
    fromName: optional('EMAIL_FROM_NAME', 'Meeting Scheduler'),
  },

  redis: {
    host: optional('REDIS_HOST', '127.0.0.1'),
    port: parseInt(optional('REDIS_PORT', '6379'), 10),
    password: optional('REDIS_PASSWORD'),
  },

  attendance: {
    // grace window (minutes) after start before a join counts as "late"
    lateGraceMinutes: parseInt(optional('ATTENDANCE_LATE_GRACE_MIN', '5'), 10),
    // leaving more than this many minutes before the end counts as "left early"
    earlyLeaveMinutes: parseInt(optional('ATTENDANCE_EARLY_LEAVE_MIN', '5'), 10),
  },

  timezone: optional('TIMEZONE', 'UTC'),
};

export type Env = typeof env;

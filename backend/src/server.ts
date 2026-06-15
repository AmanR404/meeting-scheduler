import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { startReminderWorker } from './jobs/reminderWorker';
import { verifyEmailTransport } from './services/email.service';
import { markDueMeetingsCompleted } from './services/meeting.service';
import { syncWorkspaceAttendance, isWorkspaceConfigured } from './services/workspaceAttendance.service';

/**
 * Periodically transition ended meetings to "completed". When a meeting completes
 * and Workspace is configured, best-effort pull its Meet attendance (Reports API
 * data may lag a few minutes, so the teacher can also re-sync manually).
 */
function startCompletionSweep() {
  const run = async () => {
    try {
      const completed = await markDueMeetingsCompleted();
      if (completed.length && isWorkspaceConfigured()) {
        for (const m of completed) {
          try {
            await syncWorkspaceAttendance(m.organizer, m.id);
          } catch {
            /* best-effort; teacher can sync manually */
          }
        }
      }
    } catch (err) {
      logger.warn('Completion sweep failed', err);
    }
  };
  setInterval(() => void run(), 60_000).unref();
  void run();
}

async function bootstrap() {
  await connectDatabase();

  // Background services (degrade gracefully if Redis/SMTP unavailable)
  startReminderWorker();
  void verifyEmailTransport();
  startCompletionSweep();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`🚀 Server running at ${env.serverUrl} (env: ${env.nodeEnv})`);
    logger.info(`📚 API docs at ${env.serverUrl}/api/docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // Force-exit if not closed within 10s
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', reason);
  });
}

bootstrap().catch((err) => {
  logger.error('Fatal startup error', err);
  process.exit(1);
});

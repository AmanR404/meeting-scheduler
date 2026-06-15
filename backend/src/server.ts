import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { startReminderWorker } from './jobs/reminderWorker';
import { verifyEmailTransport } from './services/email.service';

async function bootstrap() {
  await connectDatabase();

  // Background services (degrade gracefully if Redis/SMTP unavailable)
  startReminderWorker();
  void verifyEmailTransport();

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

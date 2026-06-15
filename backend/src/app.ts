import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './config/logger';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { openapiSpec } from './config/swagger';
import routes from './routes';

export function createApp(): Application {
  const app = express();

  // Security & infrastructure middleware
  app.use(helmet());
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Request logging via winston stream
  app.use(
    morgan(env.isProd ? 'combined' : 'dev', {
      stream: { write: (msg) => logger.http?.(msg.trim()) ?? logger.info(msg.trim()) },
    })
  );

  // Rate limiting on the API surface
  app.use('/api', apiLimiter);

  // API documentation (Swagger UI + raw spec)
  app.get('/api/docs.json', (_req, res) => res.json(openapiSpec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { customSiteTitle: 'Meeting Scheduler API' }));

  // API routes
  app.use('/api', routes);

  app.get('/', (_req, res) => {
    res.json({ name: 'Meeting Scheduler API', version: '1.0.0', docs: '/api/docs' });
  });

  // 404 + error handling (must be last)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

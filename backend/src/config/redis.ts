import type { ConnectionOptions } from 'bullmq';
import { env } from './env';

/**
 * Connection options for BullMQ. We pass plain options (not an IORedis instance)
 * so BullMQ manages its own connection. `maxRetriesPerRequest: null` is required
 * by BullMQ workers. If Redis is unavailable the app keeps running and reminder
 * scheduling becomes a no-op (handled by try/catch in the queue module).
 */
export const redisConnection: ConnectionOptions = {
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => (times > 5 ? null : Math.min(times * 200, 2000)),
};

import { Response } from 'express';

interface SuccessOptions {
  message?: string;
  meta?: Record<string, unknown>;
}

/** Standard success envelope used by every controller. */
export function sendSuccess<T>(res: Response, statusCode: number, data: T, options: SuccessOptions = {}) {
  return res.status(statusCode).json({
    success: true,
    message: options.message ?? 'OK',
    data,
    ...(options.meta ? { meta: options.meta } : {}),
  });
}

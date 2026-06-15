import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { UserRole } from '../types/enums';

/** Extract a JWT from the auth cookie or the Authorization: Bearer header. */
function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[env.jwt.cookieName];
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** Requires a valid JWT. Attaches the decoded user to req.user. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return next(ApiError.unauthorized('Authentication required'));
  }
  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired session'));
  }
}

/** Restricts a route to one or more roles. Must run after `authenticate`. */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

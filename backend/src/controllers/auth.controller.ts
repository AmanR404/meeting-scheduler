import { Request, Response, CookieOptions } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { getAuthUrl, exchangeCodeForTokens, verifyIdToken } from '../services/google.service';
import { upsertUserFromGoogle } from '../services/auth.service';
import { recordAudit } from '../services/audit.service';
import { signToken } from '../utils/jwt';
import { AuditAction, UserRole } from '../types/enums';
import { User } from '../models/User';

const STATE_COOKIE = 'ms_oauth_state';

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'lax',
    path: '/',
  };
}

/** GET /api/auth/google — redirect the browser to Google's consent screen. */
export const googleLogin = asyncHandler(async (_req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, { ...baseCookieOptions(), maxAge: 10 * 60 * 1000 });
  res.redirect(getAuthUrl(state));
});

/** GET /api/auth/google/callback — handle Google's redirect, log the user in. */
export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string | undefined>;

  if (error) {
    return res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    throw ApiError.badRequest('Missing authorization code');
  }
  // CSRF: state must match the value we set before redirecting
  const savedState = req.cookies?.[STATE_COOKIE];
  if (!state || !savedState || state !== savedState) {
    throw ApiError.unauthorized('Invalid OAuth state');
  }
  res.clearCookie(STATE_COOKIE, baseCookieOptions());

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.id_token) {
    throw ApiError.unauthorized('Google did not return an identity token');
  }
  const profile = await verifyIdToken(tokens.id_token);
  const { user, isNew } = await upsertUserFromGoogle(profile, tokens);

  const jwtToken = signToken({
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  });
  res.cookie(env.jwt.cookieName, jwtToken, {
    ...baseCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  await recordAudit({
    actorId: user._id.toString(),
    action: AuditAction.USER_LOGIN,
    metadata: { isNew, email: user.email },
    req,
  });

  res.redirect(`${env.clientUrl}/dashboard`);
});

/** GET /api/auth/me — return the currently authenticated user. */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.notFound('User not found');
  sendSuccess(res, 200, user, { message: 'Current user' });
});

/** POST /api/auth/logout — clear the session cookie. */
export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie(env.jwt.cookieName, baseCookieOptions());
  sendSuccess(res, 200, null, { message: 'Logged out' });
});

/**
 * PATCH /api/auth/role — let a user switch their own role (Teacher/Candidate).
 * Gated by ALLOW_SELF_ROLE_SWITCH so it can be disabled in real production.
 * Re-issues the session cookie since the JWT carries the role.
 */
export const setRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();

  const { role } = req.body as { role?: string };
  if (role !== UserRole.TEACHER && role !== UserRole.CANDIDATE) {
    throw ApiError.badRequest('role must be "teacher" or "candidate"');
  }

  const current = await User.findById(req.user.id);
  if (!current) throw ApiError.notFound('User not found');

  // First-time selection (onboarding) is always allowed. Changing an
  // already-chosen role afterwards requires ALLOW_SELF_ROLE_SWITCH.
  const isFirstSelection = !current.roleSelected;
  if (!isFirstSelection && !env.allowSelfRoleSwitch) {
    throw ApiError.forbidden('Role switching is disabled');
  }

  current.role = role;
  current.roleSelected = true;
  await current.save();
  const user = current;

  const token = signToken({
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
  });
  res.cookie(env.jwt.cookieName, token, {
    ...baseCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  sendSuccess(res, 200, user, { message: `Role updated to ${role}` });
});

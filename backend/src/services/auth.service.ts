import { Credentials } from 'google-auth-library';
import { User, IUser } from '../models/User';
import { GoogleProfile } from './google.service';
import { UserRole } from '../types/enums';
import { env } from '../config/env';

/** Determine the role for a newly-created user based on the teacher allow-list. */
function resolveRole(email: string): UserRole {
  const lower = email.toLowerCase();
  const isTeacher =
    env.teacherEmails.includes(lower) ||
    (env.google.workspaceAdminEmail && lower === env.google.workspaceAdminEmail.toLowerCase());
  return isTeacher ? UserRole.TEACHER : UserRole.CANDIDATE;
}

interface UpsertResult {
  user: IUser;
  isNew: boolean;
}

/**
 * Creates the user on first login or updates their profile/tokens on subsequent
 * logins. Stores Google tokens so we can act on the user's calendar later.
 */
export async function upsertUserFromGoogle(
  profile: GoogleProfile,
  tokens: Credentials
): Promise<UpsertResult> {
  // Match by googleId, or by email to upgrade a placeholder invited user (googleId "pending:<email>")
  const existing = await User.findOne({
    $or: [{ googleId: profile.googleId }, { email: profile.email.toLowerCase() }],
  });
  const now = new Date();

  const tokenFields: Partial<IUser> = {
    googleAccessToken: tokens.access_token ?? undefined,
    googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
  };
  // Google only returns a refresh token on first consent — preserve the old one otherwise.
  if (tokens.refresh_token) {
    tokenFields.googleRefreshToken = tokens.refresh_token;
  }

  if (existing) {
    const wasPlaceholder = existing.googleId.startsWith('pending:');
    existing.googleId = profile.googleId; // upgrade placeholder to the real Google id
    existing.name = profile.name;
    existing.profileImage = profile.picture;
    existing.lastLoginAt = now;
    Object.assign(existing, tokenFields);
    await existing.save();
    return { user: existing, isNew: wasPlaceholder };
  }

  const created = await User.create({
    googleId: profile.googleId,
    email: profile.email,
    name: profile.name,
    profileImage: profile.picture,
    role: resolveRole(profile.email),
    timezone: env.timezone,
    lastLoginAt: now,
    ...tokenFields,
  });
  return { user: created, isNew: true };
}

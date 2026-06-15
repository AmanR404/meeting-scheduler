import { User, IUser } from '../models/User';
import { UserRole } from '../types/enums';
import { env } from '../config/env';

/**
 * Resolve participant emails to User documents, creating lightweight placeholder
 * candidate accounts for invitees who haven't logged in yet. When they later sign
 * in with Google, the placeholder is upgraded (matched by email) — see auth.service.
 */
export async function resolveParticipantsByEmail(emails: string[]): Promise<IUser[]> {
  const normalized = Array.from(new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)));
  const users: IUser[] = [];

  for (const email of normalized) {
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        googleId: `pending:${email}`,
        email,
        name: email.split('@')[0],
        role: UserRole.CANDIDATE,
        timezone: env.timezone,
      });
    }
    users.push(user);
  }
  return users;
}

/** List all candidate users (for the teacher's participant picker). */
export async function listCandidates(): Promise<IUser[]> {
  return User.find({ role: UserRole.CANDIDATE }).select('name email profileImage').sort({ name: 1 });
}

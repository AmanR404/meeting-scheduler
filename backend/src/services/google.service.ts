import { OAuth2Client, Credentials } from 'google-auth-library';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

/**
 * OAuth scopes requested at login.
 * - openid/email/profile: identity
 * - calendar/calendar.events: create events + Meet links on the teacher's calendar
 * - gmail.send: send invitation/reminder emails as the user (optional; we also use SMTP)
 */
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.send',
];

export function createOAuthClient(): OAuth2Client {
  return new OAuth2Client({
    clientId: env.google.clientId,
    clientSecret: env.google.clientSecret,
    redirectUri: env.google.redirectUri,
  });
}

/** Build the Google consent URL. `state` carries CSRF protection. */
export function getAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline', // request a refresh token
    prompt: 'consent', // force refresh-token issuance on every consent
    scope: GOOGLE_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

/** Exchange an authorization code for access/refresh tokens. */
export async function exchangeCodeForTokens(code: string): Promise<Credentials> {
  const client = createOAuthClient();
  try {
    const { tokens } = await client.getToken(code);
    return tokens;
  } catch {
    throw ApiError.unauthorized('Failed to exchange Google authorization code');
  }
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}

/** Verify the id_token returned by Google and extract the user profile. */
export async function verifyIdToken(idToken: string): Promise<GoogleProfile> {
  const client = createOAuthClient();
  const ticket = await client.verifyIdToken({ idToken, audience: env.google.clientId });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw ApiError.unauthorized('Invalid Google identity token');
  }
  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
    picture: payload.picture,
  };
}

/** Returns an OAuth2 client pre-loaded with a user's stored credentials (used in later phases). */
export function getAuthorizedClient(credentials: Credentials): OAuth2Client {
  const client = createOAuthClient();
  client.setCredentials(credentials);
  return client;
}

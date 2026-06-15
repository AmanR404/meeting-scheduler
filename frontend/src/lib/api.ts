import axios from 'axios';
import type { ApiEnvelope } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/** Axios instance that sends the auth cookie with every request. */
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/** Unwrap the API envelope and return just `data`. */
export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}

/** Full URL for the Google OAuth start endpoint (used as a plain link). */
export const googleLoginUrl = `${API_URL}/auth/google`;

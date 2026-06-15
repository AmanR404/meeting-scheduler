'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchMe } from '@/store/authSlice';
import { googleLoginUrl } from '@/lib/api';

function LoginContent() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useAppSelector((s) => s.auth);
  const error = params.get('error');

  useEffect(() => {
    if (status === 'idle') dispatch(fetchMe());
  }, [status, dispatch]);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">📅</div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Scheduler</h1>
          <p className="mt-1 text-sm text-gray-500">
            Schedule Google Meet meetings, track attendance, and generate reports.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            Sign-in failed: {error}. Please try again.
          </div>
        )}

        <a
          href={googleLoginUrl}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.9 6.1C12.2 13.2 17.6 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.5 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.8-9.9 6.8-17.4z" />
            <path fill="#FBBC05" d="M10.4 28.3c-.5-1.5-.8-3.1-.8-4.8s.3-3.3.8-4.8l-7.9-6.1C.9 16 0 19.9 0 24s.9 8 2.5 11.4l7.9-7.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.7 2.3-8.6 2.3-6.4 0-11.8-3.7-13.6-9.8l-7.9 7.1C6.4 42.6 14.6 48 24 48z" />
          </svg>
          Continue with Google
        </a>

        <p className="mt-6 text-center text-xs text-gray-400">
          You&apos;ll be redirected to Google to sign in securely.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}

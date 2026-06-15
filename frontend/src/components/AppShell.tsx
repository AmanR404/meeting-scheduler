'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchMe } from '@/store/authSlice';
import { Navbar } from './Navbar';
import { Spinner } from './ui';

/**
 * Wraps authenticated pages: loads the session on mount, redirects to /login if
 * unauthenticated, and renders the app chrome (navbar + container) once ready.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { status } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchMe());
  }, [status, dispatch]);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status === 'idle' || status === 'loading') {
    return <Spinner label="Loading…" />;
  }
  if (status === 'unauthenticated') {
    return <Spinner label="Redirecting to login…" />;
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, GraduationCap } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchMe, setRole } from '@/store/authSlice';
import { Spinner } from '@/components/ui';
import type { UserRole } from '@/types';

function OnboardingContent() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { status, user } = useAppSelector((s) => s.auth);
  const [saving, setSaving] = useState<UserRole | null>(null);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchMe());
  }, [status, dispatch]);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    // already chose a role -> skip onboarding
    if (status === 'authenticated' && user?.roleSelected) router.replace('/dashboard');
  }, [status, user, router]);

  const choose = async (role: UserRole) => {
    setSaving(role);
    await dispatch(setRole(role));
    router.replace('/dashboard');
  };

  if (status !== 'authenticated' || user?.roleSelected) return <Spinner label="Loading…" />;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.name?.split(' ')[0]}</h1>
          <p className="mt-1 text-gray-500">How will you use Meeting Scheduler? You can pick one to get started.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => choose('teacher')}
            disabled={!!saving}
            className="group rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-brand-400 hover:shadow disabled:opacity-50"
          >
            <GraduationCap className="mb-3 text-brand-600" size={28} />
            <h2 className="text-lg font-semibold text-gray-900">I&apos;m a Teacher</h2>
            <p className="mt-1 text-sm text-gray-500">
              Organize meetings, invite candidates, manage availability, track attendance, and export reports.
            </p>
            {saving === 'teacher' && <p className="mt-3 text-sm text-brand-600">Setting up…</p>}
          </button>

          <button
            onClick={() => choose('candidate')}
            disabled={!!saving}
            className="group rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-brand-400 hover:shadow disabled:opacity-50"
          >
            <CalendarDays className="mb-3 text-brand-600" size={28} />
            <h2 className="text-lg font-semibold text-gray-900">I&apos;m a Candidate</h2>
            <p className="mt-1 text-sm text-gray-500">
              View assigned meetings, join with one click, and see your attendance history.
            </p>
            {saving === 'candidate' && <p className="mt-3 text-sm text-brand-600">Setting up…</p>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return <OnboardingContent />;
}

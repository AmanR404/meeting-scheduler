'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { StatCard, Spinner, Card, PageHeader } from '@/components/ui';
import { MeetingCard } from '@/components/MeetingCard';
import { api, unwrap } from '@/lib/api';
import { useAppSelector } from '@/store';
import type { DashboardData } from '@/types';

function DashboardContent() {
  const user = useAppSelector((s) => s.auth.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    unwrap<DashboardData>(api.get('/dashboard'))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading dashboard…" />;
  if (!data) return <p className="text-gray-500">Could not load dashboard.</p>;

  const isTeacher = user?.role === 'teacher';
  const s = data.stats;

  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] ?? ''}`}
        action={
          isTeacher && (
            <Link
              href="/meetings/new"
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus size={16} /> New Meeting
            </Link>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Meetings" value={s.totalMeetings ?? 0} />
        <StatCard label="Upcoming" value={s.upcomingMeetings ?? 0} accent="text-brand-600" />
        {isTeacher ? (
          <>
            <StatCard label="Completed" value={s.completedMeetings ?? 0} accent="text-blue-600" />
            <StatCard label="Attendance Rate" value={`${s.attendanceRate ?? 0}%`} accent="text-green-600" />
          </>
        ) : (
          <>
            <StatCard label="Attended" value={s.attendedMeetings ?? 0} accent="text-green-600" />
            <StatCard label="Attendance Rate" value={`${s.attendanceRate ?? 0}%`} accent="text-green-600" />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Today&apos;s Meetings</h2>
          {data.todaysMeetings.length === 0 ? (
            <Card><p className="text-sm text-gray-500">No meetings today.</p></Card>
          ) : (
            <div className="space-y-3">
              {data.todaysMeetings.map((m) => <MeetingCard key={m._id} meeting={m} />)}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Upcoming Meetings</h2>
          {data.upcomingMeetings.length === 0 ? (
            <Card><p className="text-sm text-gray-500">No upcoming meetings.</p></Card>
          ) : (
            <div className="space-y-3">
              {data.upcomingMeetings.map((m) => <MeetingCard key={m._id} meeting={m} />)}
            </div>
          )}
        </section>
      </div>

      {isTeacher && data.attendanceAnalytics && (
        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Attendance Analytics</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Present" value={data.attendanceAnalytics.present} accent="text-green-600" />
            <StatCard label="Late" value={data.attendanceAnalytics.late} accent="text-amber-600" />
            <StatCard label="Left Early" value={data.attendanceAnalytics.left_early} accent="text-orange-600" />
            <StatCard label="Absent" value={data.attendanceAnalytics.absent} accent="text-red-600" />
          </div>
        </section>
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

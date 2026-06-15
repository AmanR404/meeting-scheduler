'use client';

import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card, Spinner, StatCard, PageHeader } from '@/components/ui';
import { api, unwrap } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface Summary {
  totalMeetings: number;
  upcomingMeetings: number;
  completedMeetings: number;
  cancelledMeetings: number;
  uniqueParticipants: number;
  attendanceRate: number;
  noShowRate: number;
  averageDurationMinutes: number;
  statusBreakdown: { present: number; late: number; left_early: number; absent: number };
}

function ReportsContent() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    unwrap<Summary>(api.get('/reports/summary')).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Loading analytics…" />;
  if (!data) return <p className="text-gray-500">Could not load reports.</p>;

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        action={
          <div className="flex gap-2">
            <a href={`${API}/reports/summary?format=pdf`} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"><FileDown size={14} /> PDF</a>
            <a href={`${API}/reports/summary?format=xlsx`} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"><FileDown size={14} /> Excel</a>
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Meetings" value={data.totalMeetings} />
        <StatCard label="Completed" value={data.completedMeetings} accent="text-blue-600" />
        <StatCard label="Attendance Rate" value={`${data.attendanceRate}%`} accent="text-green-600" />
        <StatCard label="No-show Rate" value={`${data.noShowRate}%`} accent="text-red-600" />
        <StatCard label="Unique Participants" value={data.uniqueParticipants} />
        <StatCard label="Avg Duration" value={`${data.averageDurationMinutes} min`} />
        <StatCard label="Upcoming" value={data.upcomingMeetings} accent="text-brand-600" />
        <StatCard label="Cancelled" value={data.cancelledMeetings} accent="text-red-600" />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-900">Attendance Breakdown</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Present" value={data.statusBreakdown.present} accent="text-green-600" />
        <StatCard label="Late" value={data.statusBreakdown.late} accent="text-amber-600" />
        <StatCard label="Left Early" value={data.statusBreakdown.left_early} accent="text-orange-600" />
        <StatCard label="Absent" value={data.statusBreakdown.absent} accent="text-red-600" />
      </div>
    </>
  );
}

export default function ReportsPage() {
  return (
    <AppShell>
      <ReportsContent />
    </AppShell>
  );
}

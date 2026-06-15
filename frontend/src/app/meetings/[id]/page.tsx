'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Video, RefreshCw, FileDown, CalendarClock, XCircle } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Card, Spinner, Badge, PageHeader } from '@/components/ui';
import { api, unwrap } from '@/lib/api';
import { useAppSelector } from '@/store';
import { formatDateTime, meetingTypeLabel } from '@/lib/format';
import type { Meeting, AttendanceRow, User } from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const isTeacher = user?.role === 'teacher';

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [resched, setResched] = useState({ date: '', start: '', end: '' });

  const load = useCallback(async () => {
    const m = await unwrap<Meeting>(api.get(`/meetings/${id}`));
    setMeeting(m);
    if (user?.role === 'teacher') {
      const a = await unwrap<AttendanceRow[]>(api.get(`/attendance/meeting/${id}`));
      setRows(a);
    }
  }, [id, user?.role]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  // Candidate: heartbeat while present
  useEffect(() => {
    if (isTeacher || !meeting || meeting.status !== 'scheduled') return;
    const t = setInterval(() => {
      api.post(`/attendance/${id}/heartbeat`).catch(() => {});
    }, 60000);
    return () => clearInterval(t);
  }, [id, isTeacher, meeting]);

  const join = async () => {
    try {
      const res = await unwrap<{ meetLink?: string }>(api.post(`/attendance/${id}/join`));
      if (res.meetLink) window.open(res.meetLink, '_blank');
    } catch {
      setMsg('Could not record join.');
    }
  };

  const sync = async () => {
    setMsg('Syncing attendance from Google Workspace…');
    try {
      const res = await unwrap<{ updated: number }>(api.post(`/attendance/${id}/sync`));
      setMsg(`Synced ${res.updated} participant(s).`);
      await load();
    } catch (e) {
      setMsg('Workspace sync unavailable (using app-based attendance).');
    }
  };

  const cancel = async () => {
    if (!confirm('Cancel this meeting? Participants will be notified.')) return;
    await api.delete(`/meetings/${id}`, { data: { reason: 'Cancelled by organizer' } });
    router.push('/meetings');
  };

  const submitReschedule = async () => {
    const start = new Date(`${resched.date}T${resched.start}`).toISOString();
    const end = new Date(`${resched.date}T${resched.end}`).toISOString();
    try {
      await api.patch(`/meetings/${id}/reschedule`, { startTime: start, endTime: end });
      setShowReschedule(false);
      setMsg('Meeting rescheduled.');
      await load();
    } catch {
      setMsg('Reschedule failed (possible conflict).');
    }
  };

  if (loading) return <Spinner />;
  if (!meeting) return <p className="text-gray-500">Meeting not found.</p>;

  const organizer = meeting.organizer as User;

  return (
    <>
      <PageHeader title={meeting.title} action={<Badge status={meeting.status} />} />
      {msg && <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{msg}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-500">Type</dt><dd>{meetingTypeLabel(meeting.type)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">When</dt><dd>{formatDateTime(meeting.startTime, meeting.timezone)} – {formatDateTime(meeting.endTime, meeting.timezone)}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Organizer</dt><dd>{organizer?.name ?? '—'}</dd></div>
            {meeting.description && <div><dt className="text-gray-500">Description</dt><dd className="mt-1">{meeting.description}</dd></div>}
          </dl>

          {meeting.meetLink && meeting.status === 'scheduled' && (
            <div className="mt-4 flex flex-wrap gap-3">
              {!isTeacher && (
                <button onClick={join} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                  <Video size={16} /> Join Meeting
                </button>
              )}
              <a href={meeting.meetLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Video size={16} /> Open Meet Link
              </a>
            </div>
          )}
        </Card>

        {isTeacher && meeting.status !== 'cancelled' && (
          <Card>
            <h3 className="mb-3 font-semibold text-gray-900">Organizer Actions</h3>
            <div className="space-y-2">
              {meeting.status === 'scheduled' && (
                <>
                  <button onClick={() => setShowReschedule((v) => !v)} className="flex w-full items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
                    <CalendarClock size={16} /> Reschedule
                  </button>
                  {showReschedule && (
                    <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                      <input type="date" className="w-full rounded border px-2 py-1 text-sm" onChange={(e) => setResched((r) => ({ ...r, date: e.target.value }))} />
                      <div className="flex gap-2">
                        <input type="time" className="w-full rounded border px-2 py-1 text-sm" onChange={(e) => setResched((r) => ({ ...r, start: e.target.value }))} />
                        <input type="time" className="w-full rounded border px-2 py-1 text-sm" onChange={(e) => setResched((r) => ({ ...r, end: e.target.value }))} />
                      </div>
                      <button onClick={submitReschedule} className="w-full rounded bg-brand-600 px-3 py-1.5 text-sm text-white">Confirm</button>
                    </div>
                  )}
                </>
              )}
              <button onClick={sync} className="flex w-full items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
                <RefreshCw size={16} /> Sync Attendance
              </button>
              {meeting.status === 'scheduled' && (
                <button onClick={cancel} className="flex w-full items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <XCircle size={16} /> Cancel Meeting
                </button>
              )}
            </div>
          </Card>
        )}
      </div>

      {isTeacher && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Attendance</h2>
            <div className="flex gap-2">
              <a href={`${API}/reports/meeting/${id}?format=pdf`} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"><FileDown size={14} /> PDF</a>
              <a href={`${API}/reports/meeting/${id}?format=xlsx`} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"><FileDown size={14} /> Excel</a>
            </div>
          </div>
          <Card className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2">Candidate</th>
                  <th className="px-4 py-2">Join</th>
                  <th className="px-4 py-2">Leave</th>
                  <th className="px-4 py-2">Min</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.participantId} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.email}</div>
                    </td>
                    <td className="px-4 py-2">{formatDateTime(r.joinTime, meeting.timezone)}</td>
                    <td className="px-4 py-2">{formatDateTime(r.leaveTime, meeting.timezone)}</td>
                    <td className="px-4 py-2">{r.durationMinutes}</td>
                    <td className="px-4 py-2"><Badge status={r.status} /></td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No participants.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </>
  );
}

export default function MeetingDetailPage() {
  return (
    <AppShell>
      <MeetingDetail />
    </AppShell>
  );
}

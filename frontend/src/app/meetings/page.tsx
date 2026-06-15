'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { Spinner, Card, PageHeader } from '@/components/ui';
import { MeetingCard } from '@/components/MeetingCard';
import { api, unwrap } from '@/lib/api';
import { useAppSelector } from '@/store';
import type { Meeting, MeetingStatus } from '@/types';

const FILTERS: { label: string; value: MeetingStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

function MeetingsContent() {
  const user = useAppSelector((s) => s.auth.user);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<MeetingStatus | 'all'>('all');

  useEffect(() => {
    setLoading(true);
    const q = filter === 'all' ? '' : `?status=${filter}`;
    unwrap<Meeting[]>(api.get(`/meetings${q}`))
      .then(setMeetings)
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <>
      <PageHeader
        title="Meetings"
        action={
          user?.role === 'teacher' && (
            <Link
              href="/meetings/new"
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Plus size={16} /> New Meeting
            </Link>
          )
        }
      />

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f.value ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : meetings.length === 0 ? (
        <Card><p className="text-sm text-gray-500">No meetings found.</p></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {meetings.map((m) => <MeetingCard key={m._id} meeting={m} />)}
        </div>
      )}
    </>
  );
}

export default function MeetingsPage() {
  return (
    <AppShell>
      <MeetingsContent />
    </AppShell>
  );
}

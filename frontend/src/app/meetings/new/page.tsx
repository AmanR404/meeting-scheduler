'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Card, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import type { MeetingType, RecurrenceFrequency } from '@/types';
import { AxiosError } from 'axios';

const TYPES: { value: MeetingType; label: string }[] = [
  { value: 'interview', label: 'Interview' },
  { value: 'technical_assessment', label: 'Technical Assessment' },
  { value: 'training', label: 'Training' },
  { value: 'classroom', label: 'Classroom' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'mock_interview', label: 'Mock Interview' },
  { value: 'group_discussion', label: 'Group Discussion' },
];

const label = 'block text-sm font-medium text-gray-700 mb-1';
const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';

function NewMeetingForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'interview' as MeetingType,
    date: '',
    startTime: '',
    endTime: '',
    participants: '',
    frequency: 'none' as RecurrenceFrequency,
    count: 1,
    notes: '',
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const participantEmails = form.participants.split(',').map((s) => s.trim()).filter(Boolean);
    if (participantEmails.length === 0) return setError('Add at least one participant email.');
    if (!form.date || !form.startTime || !form.endTime) return setError('Date and times are required.');

    const start = new Date(`${form.date}T${form.startTime}`);
    const end = new Date(`${form.date}T${form.endTime}`);

    const body: Record<string, unknown> = {
      title: form.title,
      description: form.description || undefined,
      notes: form.notes || undefined,
      type: form.type,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      participantEmails,
    };
    if (form.frequency !== 'none') {
      body.recurrence = { frequency: form.frequency, interval: 1, count: Number(form.count) };
    }

    setSubmitting(true);
    try {
      await api.post('/meetings', body);
      router.push('/meetings');
    } catch (err) {
      const ax = err as AxiosError<{ message: string; details?: { reason: string }[] }>;
      const details = ax.response?.data?.details;
      setError(
        Array.isArray(details)
          ? `Conflict: ${details.map((d) => d.reason).join('; ')}`
          : ax.response?.data?.message || 'Failed to create meeting.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="New Meeting" />
      <Card className="max-w-2xl">
        {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className={label}>Title *</label>
            <input className={input} required value={form.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          <div>
            <label className={label}>Description</label>
            <textarea className={input} rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Type *</label>
              <select className={input} value={form.type} onChange={(e) => set('type', e.target.value)}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Date *</label>
              <input type="date" className={input} required value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Start Time *</label>
              <input type="time" className={input} required value={form.startTime} onChange={(e) => set('startTime', e.target.value)} />
            </div>
            <div>
              <label className={label}>End Time *</label>
              <input type="time" className={input} required value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label}>Participant Emails * (comma-separated)</label>
            <input className={input} placeholder="alice@example.com, bob@example.com" value={form.participants} onChange={(e) => set('participants', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Recurrence</label>
              <select className={input} value={form.frequency} onChange={(e) => set('frequency', e.target.value)}>
                <option value="none">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {form.frequency !== 'none' && (
              <div>
                <label className={label}>Occurrences</label>
                <input type="number" min={1} max={52} className={input} value={form.count} onChange={(e) => set('count', Number(e.target.value))} />
              </div>
            )}
          </div>
          <div>
            <label className={label}>Notes</label>
            <textarea className={input} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create Meeting'}
            </button>
            <button type="button" onClick={() => router.back()} className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </Card>
    </>
  );
}

export default function NewMeetingPage() {
  return (
    <AppShell>
      <NewMeetingForm />
    </AppShell>
  );
}

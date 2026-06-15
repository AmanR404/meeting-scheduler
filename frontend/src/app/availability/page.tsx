'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Card, Spinner, PageHeader } from '@/components/ui';
import { api, unwrap } from '@/lib/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface WorkingHour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

interface Availability {
  workingHours: WorkingHour[];
  holidays: string[];
  blockedSlots: { start: string; end: string; reason?: string }[];
  timezone?: string;
}

function defaultHours(): WorkingHour[] {
  return DAYS.map((_, i) => ({
    dayOfWeek: i,
    startTime: '09:00',
    endTime: '18:00',
    enabled: i >= 1 && i <= 5,
  }));
}

function AvailabilityContent() {
  const [hours, setHours] = useState<WorkingHour[]>(defaultHours());
  const [holidays, setHolidays] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    unwrap<Availability>(api.get('/availability'))
      .then((a) => {
        if (a.workingHours?.length) {
          const map = new Map(a.workingHours.map((w) => [w.dayOfWeek, w]));
          setHours(DAYS.map((_, i) => map.get(i) ?? { dayOfWeek: i, startTime: '09:00', endTime: '18:00', enabled: false }));
        }
        if (a.holidays?.length) setHolidays(a.holidays.map((h) => h.slice(0, 10)).join(', '));
      })
      .finally(() => setLoading(false));
  }, []);

  const setHour = (i: number, patch: Partial<WorkingHour>) =>
    setHours((hs) => hs.map((h, idx) => (idx === i ? { ...h, ...patch } : h)));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await api.put('/availability', {
        workingHours: hours.filter((h) => h.enabled),
        holidays: holidays.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setMsg('Availability saved.');
    } catch {
      setMsg('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <>
      <PageHeader title="Availability" />
      {msg && <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">{msg}</div>}

      <Card className="mb-6 max-w-2xl">
        <h2 className="mb-3 font-semibold text-gray-900">Working Hours</h2>
        <div className="space-y-2">
          {hours.map((h, i) => (
            <div key={i} className="flex items-center gap-3">
              <label className="flex w-20 items-center gap-2">
                <input type="checkbox" checked={h.enabled} onChange={(e) => setHour(i, { enabled: e.target.checked })} />
                <span className="text-sm">{DAYS[i]}</span>
              </label>
              <input type="time" value={h.startTime} disabled={!h.enabled} onChange={(e) => setHour(i, { startTime: e.target.value })} className="rounded border px-2 py-1 text-sm disabled:opacity-40" />
              <span className="text-gray-400">–</span>
              <input type="time" value={h.endTime} disabled={!h.enabled} onChange={(e) => setHour(i, { endTime: e.target.value })} className="rounded border px-2 py-1 text-sm disabled:opacity-40" />
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-6 max-w-2xl">
        <h2 className="mb-2 font-semibold text-gray-900">Holidays</h2>
        <p className="mb-2 text-sm text-gray-500">Comma-separated dates (YYYY-MM-DD). Meetings can&apos;t be scheduled on these days.</p>
        <input value={holidays} onChange={(e) => setHolidays(e.target.value)} placeholder="2026-12-25, 2027-01-01" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
      </Card>

      <button onClick={save} disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
        {saving ? 'Saving…' : 'Save Availability'}
      </button>
    </>
  );
}

export default function AvailabilityPage() {
  return (
    <AppShell>
      <AvailabilityContent />
    </AppShell>
  );
}

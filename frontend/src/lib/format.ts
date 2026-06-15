const TZ = 'Asia/Kolkata';

export function formatDateTime(iso?: string, tz = TZ): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function formatTime(iso?: string, tz = TZ): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso)
  );
}

export function formatDate(iso?: string, tz = TZ): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-US', { timeZone: tz, dateStyle: 'full' }).format(new Date(iso));
}

export function meetingTypeLabel(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusColor(status: string): string {
  switch (status) {
    case 'present':
    case 'scheduled':
      return 'bg-green-100 text-green-700';
    case 'late':
      return 'bg-amber-100 text-amber-700';
    case 'left_early':
      return 'bg-orange-100 text-orange-700';
    case 'absent':
    case 'cancelled':
      return 'bg-red-100 text-red-700';
    case 'completed':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

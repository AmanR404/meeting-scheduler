import Link from 'next/link';
import { Video } from 'lucide-react';
import type { Meeting } from '@/types';
import { formatDateTime, meetingTypeLabel } from '@/lib/format';
import { Badge } from './ui';

export function MeetingCard({ meeting }: { meeting: Meeting }) {
  const participantCount = Array.isArray(meeting.participants) ? meeting.participants.length : 0;
  return (
    <Link
      href={`/meetings/${meeting._id}`}
      className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
        <Badge status={meeting.status} />
      </div>
      <div className="text-sm text-gray-500">{meetingTypeLabel(meeting.type)}</div>
      <div className="mt-2 text-sm text-gray-700">{formatDateTime(meeting.startTime, meeting.timezone)}</div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-500">{participantCount} participant(s)</span>
        {meeting.meetLink && meeting.status === 'scheduled' && (
          <span className="flex items-center gap-1 text-xs font-medium text-brand-600">
            <Video size={14} /> Meet
          </span>
        )}
      </div>
    </Link>
  );
}

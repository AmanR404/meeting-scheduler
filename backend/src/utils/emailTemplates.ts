interface MeetingEmailData {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  meetLink?: string;
  organizerName: string;
}

function formatRange(start: Date, end: Date, timeZone: string): string {
  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', minute: '2-digit' });
  return `${dateFmt.format(start)}, ${timeFmt.format(start)} – ${timeFmt.format(end)} (${timeZone})`;
}

function shell(heading: string, accent: string, body: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
    <div style="background:${accent};color:#fff;padding:18px 24px;font-size:18px;font-weight:bold">${heading}</div>
    <div style="padding:24px;color:#111827;font-size:14px;line-height:1.6">${body}</div>
    <div style="padding:14px 24px;background:#f9fafb;color:#6b7280;font-size:12px">Sent by Meeting Scheduler</div>
  </div>`;
}

function detailsBlock(d: MeetingEmailData): string {
  return `
    <p style="margin:0 0 6px"><strong>${d.title}</strong></p>
    ${d.description ? `<p style="margin:0 0 10px;color:#374151">${d.description}</p>` : ''}
    <p style="margin:0 0 4px">🕒 ${formatRange(d.startTime, d.endTime, d.timezone)}</p>
    <p style="margin:0 0 4px">👤 Organizer: ${d.organizerName}</p>
    ${
      d.meetLink
        ? `<p style="margin:14px 0"><a href="${d.meetLink}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">Join Google Meet</a></p>
           <p style="margin:0;color:#6b7280;font-size:12px">${d.meetLink}</p>`
        : ''
    }`;
}

export function invitationEmail(d: MeetingEmailData) {
  return {
    subject: `Invitation: ${d.title}`,
    html: shell('You are invited to a meeting', '#2563eb', detailsBlock(d)),
  };
}

export function reminderEmail(d: MeetingEmailData, offsetLabel: string) {
  return {
    subject: `Reminder: ${d.title} starts in ${offsetLabel}`,
    html: shell(
      `Reminder — starts in ${offsetLabel}`,
      '#0891b2',
      `<p style="margin:0 0 12px">This is a reminder for your upcoming meeting.</p>${detailsBlock(d)}`
    ),
  };
}

export function rescheduleEmail(d: MeetingEmailData) {
  return {
    subject: `Rescheduled: ${d.title}`,
    html: shell(
      'Meeting rescheduled',
      '#d97706',
      `<p style="margin:0 0 12px">The following meeting has a new time:</p>${detailsBlock(d)}`
    ),
  };
}

export function cancellationEmail(d: MeetingEmailData, reason?: string) {
  return {
    subject: `Cancelled: ${d.title}`,
    html: shell(
      'Meeting cancelled',
      '#dc2626',
      `<p style="margin:0 0 12px">The following meeting has been cancelled${reason ? `: <em>${reason}</em>` : '.'}</p>
       <p style="margin:0 0 6px"><strong>${d.title}</strong></p>
       <p style="margin:0;color:#374151">🕒 ${formatRange(d.startTime, d.endTime, d.timezone)}</p>`
    ),
  };
}

import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { MeetingReport, TeacherSummary } from './report.service';

function fmt(d?: Date, tz = 'UTC'): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

function statusLabel(s: string): string {
  return s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------- PDF ----------

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

export async function meetingReportPdf(report: MeetingReport): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const tz = report.meeting.timezone;

  doc.fontSize(18).text('Meeting Attendance Report', { underline: false });
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor('#374151');
  doc.text(`Meeting: ${report.meeting.title}`);
  doc.text(`Type: ${statusLabel(report.meeting.type)}`);
  doc.text(`When: ${fmt(report.meeting.startTime, tz)} – ${fmt(report.meeting.endTime, tz)}`);
  doc.text(`Status: ${statusLabel(report.meeting.status)}`);
  doc.text(
    `Attendance: ${report.presentCount}/${report.totalParticipants} present (${report.attendancePct}%)`
  );
  doc.moveDown(0.8);

  // Table header
  const cols = [
    { label: 'Candidate', width: 130 },
    { label: 'Join', width: 110 },
    { label: 'Leave', width: 110 },
    { label: 'Min', width: 40 },
    { label: 'Status', width: 80 },
  ];
  let x = doc.x;
  const startX = x;
  doc.fontSize(10).fillColor('#111827').font('Helvetica-Bold');
  cols.forEach((c) => {
    doc.text(c.label, x, doc.y, { width: c.width, continued: false });
    x += c.width;
  });
  doc.moveTo(startX, doc.y + 2).lineTo(540, doc.y + 2).stroke('#d1d5db');
  doc.moveDown(0.3);
  doc.font('Helvetica').fillColor('#374151');

  report.rows.forEach((r) => {
    const rowY = doc.y;
    let cx = startX;
    const cells = [r.name, fmt(r.joinTime, tz), fmt(r.leaveTime, tz), String(r.durationMinutes), statusLabel(r.status)];
    cells.forEach((val, i) => {
      doc.text(val, cx, rowY, { width: cols[i].width });
      cx += cols[i].width;
    });
    doc.moveDown(0.2);
  });

  return pdfToBuffer(doc);
}

export async function summaryPdf(summary: TeacherSummary): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.fontSize(18).text('Attendance Analytics Summary');
  doc.moveDown(0.6);
  doc.fontSize(11).fillColor('#374151');

  const lines: [string, string][] = [
    ['Total meetings', String(summary.totalMeetings)],
    ['Upcoming', String(summary.upcomingMeetings)],
    ['Completed', String(summary.completedMeetings)],
    ['Cancelled', String(summary.cancelledMeetings)],
    ['Unique participants', String(summary.uniqueParticipants)],
    ['Attendance rate', `${summary.attendanceRate}%`],
    ['No-show rate', `${summary.noShowRate}%`],
    ['Average duration', `${summary.averageDurationMinutes} min`],
    ['Present', String(summary.statusBreakdown.present)],
    ['Late', String(summary.statusBreakdown.late)],
    ['Left early', String(summary.statusBreakdown.left_early)],
    ['Absent', String(summary.statusBreakdown.absent)],
  ];
  lines.forEach(([k, v]) => doc.text(`${k}: ${v}`));
  return pdfToBuffer(doc);
}

// ---------- Excel ----------

export async function meetingReportExcel(report: MeetingReport): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Meeting Scheduler';
  const ws = wb.addWorksheet('Attendance');
  const tz = report.meeting.timezone;

  ws.addRow([report.meeting.title]);
  ws.addRow([`${fmt(report.meeting.startTime, tz)} – ${fmt(report.meeting.endTime, tz)}`]);
  ws.addRow([`Attendance: ${report.presentCount}/${report.totalParticipants} (${report.attendancePct}%)`]);
  ws.addRow([]);
  const header = ws.addRow(['Candidate', 'Email', 'Join Time', 'Leave Time', 'Duration (min)', 'Status']);
  header.font = { bold: true };

  report.rows.forEach((r) => {
    ws.addRow([r.name, r.email, fmt(r.joinTime, tz), fmt(r.leaveTime, tz), r.durationMinutes, statusLabel(r.status)]);
  });
  ws.columns.forEach((c) => (c.width = 22));

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function summaryExcel(summary: TeacherSummary): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Meeting Scheduler';
  const ws = wb.addWorksheet('Summary');
  const header = ws.addRow(['Metric', 'Value']);
  header.font = { bold: true };
  const rows: [string, string | number][] = [
    ['Total meetings', summary.totalMeetings],
    ['Upcoming', summary.upcomingMeetings],
    ['Completed', summary.completedMeetings],
    ['Cancelled', summary.cancelledMeetings],
    ['Unique participants', summary.uniqueParticipants],
    ['Attendance rate (%)', summary.attendanceRate],
    ['No-show rate (%)', summary.noShowRate],
    ['Average duration (min)', summary.averageDurationMinutes],
    ['Present', summary.statusBreakdown.present],
    ['Late', summary.statusBreakdown.late],
    ['Left early', summary.statusBreakdown.left_early],
    ['Absent', summary.statusBreakdown.absent],
  ];
  rows.forEach((r) => ws.addRow(r));
  ws.columns.forEach((c) => (c.width = 26));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { getMeetingReport, getTeacherSummary } from '../services/report.service';
import {
  meetingReportPdf,
  meetingReportExcel,
  summaryPdf,
  summaryExcel,
} from '../services/reportExport.service';
import { recordAudit } from '../services/audit.service';
import { AuditAction } from '../types/enums';

type Format = 'json' | 'pdf' | 'xlsx';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** GET /api/reports/meeting/:meetingId?format=json|pdf|xlsx */
export const meetingReport = asyncHandler(async (req: Request, res: Response) => {
  const format = ((req.query.format as string) || 'json') as Format;
  const report = await getMeetingReport(req.user!.id, req.params.meetingId);

  if (format === 'pdf' || format === 'xlsx') {
    await recordAudit({
      actorId: req.user!.id,
      action: AuditAction.REPORT_DOWNLOAD,
      targetType: 'Meeting',
      targetId: req.params.meetingId,
      metadata: { format },
      req,
    });
  }

  if (format === 'pdf') {
    const buf = await meetingReportPdf(report);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${report.meeting.id}.pdf"`);
    return res.send(buf);
  }
  if (format === 'xlsx') {
    const buf = await meetingReportExcel(report);
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="attendance-${report.meeting.id}.xlsx"`);
    return res.send(buf);
  }
  return sendSuccess(res, 200, report);
});

/** GET /api/reports/summary?from&to&format=json|pdf|xlsx (teacher) */
export const summary = asyncHandler(async (req: Request, res: Response) => {
  const format = ((req.query.format as string) || 'json') as Format;
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  const data = await getTeacherSummary(req.user!.id, from, to);

  if (format === 'pdf' || format === 'xlsx') {
    await recordAudit({
      actorId: req.user!.id,
      action: AuditAction.REPORT_DOWNLOAD,
      targetType: 'Summary',
      metadata: { format },
      req,
    });
  }

  if (format === 'pdf') {
    const buf = await summaryPdf(data);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-summary.pdf"');
    return res.send(buf);
  }
  if (format === 'xlsx') {
    const buf = await summaryExcel(data);
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader('Content-Disposition', 'attachment; filename="attendance-summary.xlsx"');
    return res.send(buf);
  }
  return sendSuccess(res, 200, data);
});

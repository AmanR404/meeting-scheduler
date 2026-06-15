import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { getTeacherDashboard, getCandidateDashboard } from '../services/dashboard.service';
import { UserRole } from '../types/enums';

/** GET /api/dashboard — role-aware dashboard data. */
export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const data =
    user.role === UserRole.TEACHER
      ? await getTeacherDashboard(user.id)
      : await getCandidateDashboard(user.id);
  sendSuccess(res, 200, { role: user.role, ...data });
});

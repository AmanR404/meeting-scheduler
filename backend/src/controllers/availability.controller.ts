import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/ApiError';
import { User } from '../models/User';

/** GET /api/availability — the teacher's working hours, holidays, blocked slots. */
export const getAvailability = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).select('workingHours holidays blockedSlots timezone');
  if (!user) throw ApiError.notFound('User not found');
  sendSuccess(res, 200, {
    workingHours: user.workingHours,
    holidays: user.holidays,
    blockedSlots: user.blockedSlots,
    timezone: user.timezone,
  });
});

/** PUT /api/availability — replace the teacher's availability configuration. */
export const updateAvailability = asyncHandler(async (req: Request, res: Response) => {
  const update: Record<string, unknown> = {};
  ['workingHours', 'holidays', 'blockedSlots', 'timezone'].forEach((k) => {
    if (req.body[k] !== undefined) update[k] = req.body[k];
  });
  const user = await User.findByIdAndUpdate(req.user!.id, update, { new: true }).select(
    'workingHours holidays blockedSlots timezone'
  );
  if (!user) throw ApiError.notFound('User not found');
  sendSuccess(res, 200, user, { message: 'Availability updated' });
});
